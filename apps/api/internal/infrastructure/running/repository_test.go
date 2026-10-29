package running

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database/migrations"
)

// newTestRepo builds a PostgreSQL database holding running_sessions plus every
// migration that touches running_*, applied exactly as the migration runner does.
func newTestRepo(t *testing.T) (*Repository, *sql.DB) {
	t.Helper()
	ctx := context.Background()

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	conn, err := database.Connect(url)
	if err != nil {
		t.Fatalf("open local db failed: %v", err)
	}
	sqlDB := conn.DB
	t.Cleanup(func() { _ = conn.Close() })

	// Columns the repository reads/writes on running_sessions.
	if _, err := sqlDB.ExecContext(ctx, `CREATE TABLE running_sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		date TEXT NOT NULL,
		distance REAL NOT NULL DEFAULT 0,
		duration INTEGER NOT NULL DEFAULT 0,
		pace TEXT DEFAULT '',
		speed REAL NOT NULL DEFAULT 0,
		calories INTEGER NOT NULL DEFAULT 0,
		elevation REAL NOT NULL DEFAULT 0,
		heart_rate INTEGER NOT NULL DEFAULT 0,
		cadence INTEGER NOT NULL DEFAULT 0,
		gps_route TEXT,
		source TEXT NOT NULL DEFAULT 'manual',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`); err != nil {
		t.Fatalf("create running_sessions failed: %v", err)
	}

	applyMigrations(t, ctx, sqlDB,
		"027_running_gps_points.sql",
		"031_running_session_devices.sql",
	)

	return NewRepository(sqlDB), sqlDB
}

// applyMigrations runs real migration files through the same statement splitter
// the production runner uses, so broken SQL in a migration fails here too.
func applyMigrations(t *testing.T, ctx context.Context, db *sql.DB, names ...string) {
	t.Helper()
	for _, name := range names {
		raw, err := os.ReadFile(filepath.Join("..", "..", "..", "migrations", name))
		if err != nil {
			t.Fatalf("read migration %s failed: %v", name, err)
		}
		for _, stmt := range migrations.SplitStatements(string(raw)) {
			if _, err := db.ExecContext(ctx, stmt); err != nil {
				t.Fatalf("migration %s: %v", name, err)
			}
		}
	}
}

func session(id, userID, externalID, source, device string, brand string) *domain.RunningSession {
	return &domain.RunningSession{
		ID:          id,
		UserID:      userID,
		Date:        "2026-10-18",
		Distance:    10,
		Duration:    3000,
		Pace:        "5:00",
		Speed:       12,
		Source:      source,
		ExternalID:  externalID,
		DeviceName:  device,
		DeviceBrand: brand,
	}
}

func TestRepository_DeviceProvenanceSurvivesTheRoundTrip(t *testing.T) {
	ctx := context.Background()
	repo, _ := newTestRepo(t)

	watch := session("s-1", "user-1", "HK-uuid-1", domain.SourceAppleWatch, "Apple Watch de Juan", "Apple")
	if err := repo.SaveSession(ctx, watch); err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}
	if err := repo.SaveSessionDevice(ctx, watch); err != nil {
		t.Fatalf("SaveSessionDevice failed: %v", err)
	}

	got, err := repo.GetSession(ctx, "s-1")
	if err != nil {
		t.Fatalf("GetSession failed: %v", err)
	}
	if got.DeviceName != "Apple Watch de Juan" || got.DeviceBrand != "Apple" {
		t.Errorf("device lost on read: name=%q brand=%q", got.DeviceName, got.DeviceBrand)
	}
	if got.ExternalID != "HK-uuid-1" {
		t.Errorf("external id lost on read: %q", got.ExternalID)
	}
	if got.Source != domain.SourceAppleWatch {
		t.Errorf("expected source %q, got %q", domain.SourceAppleWatch, got.Source)
	}
}

func TestRepository_ExternalIDIsTheDedupeKey(t *testing.T) {
	ctx := context.Background()
	repo, _ := newTestRepo(t)

	first := session("s-1", "user-1", "HK-uuid-1", domain.SourceAppleWatch, "Apple Watch", "Apple")
	if err := repo.SaveSession(ctx, first); err != nil {
		t.Fatalf("SaveSession failed: %v", err)
	}
	if err := repo.SaveSessionDevice(ctx, first); err != nil {
		t.Fatalf("SaveSessionDevice failed: %v", err)
	}

	found, ok, err := repo.GetSessionIDByExternalID(ctx, "user-1", "HK-uuid-1")
	if err != nil {
		t.Fatalf("GetSessionIDByExternalID failed: %v", err)
	}
	if !ok || found != "s-1" {
		t.Fatalf("expected to find s-1, got id=%q found=%v", found, ok)
	}

	// Another athlete running with the same watch uuid must not collide.
	other, ok, err := repo.GetSessionIDByExternalID(ctx, "user-2", "HK-uuid-1")
	if err != nil {
		t.Fatalf("cross-user lookup failed: %v", err)
	}
	if ok || other != "" {
		t.Errorf("external id leaked across users: id=%q found=%v", other, ok)
	}

	// A second write of the same workout for the same athlete is rejected by the
	// unique index, which is what makes a re-sync a no-op instead of a duplicate.
	dup := session("s-2", "user-1", "HK-uuid-1", domain.SourceAppleWatch, "Apple Watch", "Apple")
	if err := repo.SaveSessionDevice(ctx, dup); err == nil {
		t.Error("expected the unique index to reject a duplicated external id")
	}
}

func TestRepository_ListKeepsManualSessionsAndLabelsDeviceRuns(t *testing.T) {
	ctx := context.Background()
	repo, _ := newTestRepo(t)

	manual := session("s-manual", "user-1", "", domain.SourceManual, "", "")
	manual.Date = "2026-10-17"
	if err := repo.SaveSession(ctx, manual); err != nil {
		t.Fatalf("SaveSession(manual) failed: %v", err)
	}

	garmin := session("s-garmin", "user-1", "garmin-998877", domain.SourceGarmin, "Forerunner 265", "Garmin")
	garmin.Date = "2026-10-18"
	if err := repo.SaveSession(ctx, garmin); err != nil {
		t.Fatalf("SaveSession(garmin) failed: %v", err)
	}
	if err := repo.SaveSessionDevice(ctx, garmin); err != nil {
		t.Fatalf("SaveSessionDevice failed: %v", err)
	}

	sessions, err := repo.ListSessionsByUser(ctx, "user-1", "", "", 10, 0)
	if err != nil {
		t.Fatalf("ListSessionsByUser failed: %v", err)
	}
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions (the LEFT JOIN must not drop the manual one), got %d", len(sessions))
	}

	byID := map[string]*domain.RunningSession{}
	for _, s := range sessions {
		byID[s.ID] = s
	}
	if got := byID["s-garmin"]; got == nil || got.DeviceName != "Forerunner 265" || got.DeviceBrand != "Garmin" {
		t.Errorf("garmin provenance missing from the list: %+v", got)
	}
	if got := byID["s-manual"]; got == nil || got.DeviceName != "" || got.ExternalID != "" {
		t.Errorf("manual session should carry no device provenance: %+v", got)
	}
}
