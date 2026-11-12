package invite

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/joho/godotenv"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// newCoachFixture connects to the configured database and inserts a coach with
// a known code. The row is removed when the test finishes.
func newCoachFixture(t *testing.T) (*Repository, string, string, func()) {
	t.Helper()

	// The API reads its .env at startup; the tests read the environment
	// directly, so the file is loaded here too (best effort).
	_ = godotenv.Load()
	_ = godotenv.Load("../../../../.env")
	_ = godotenv.Load("../../../.env")

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	db, err := database.Connect(url)
	if err != nil {
		t.Skipf("skipping: cannot connect to the database: %v", err)
	}

	coachID := fmt.Sprintf("coach_invite_test_%d", os.Getpid())
	// The code must be unique per run: the lookup matches on the code.
	code := fmt.Sprintf("MR-%08X", os.Getpid()%0xFFFFFFFF)

	// The coaches table is tenant scoped, so the insert needs the same RLS
	// context the application sets when it provisions a coach.
	tx, err := db.DB.BeginTx(context.Background(), nil)
	if err != nil {
		db.Close()
		t.Skipf("skipping: cannot start the fixture transaction: %v", err)
	}
	if _, err := tx.ExecContext(context.Background(),
		`SELECT set_config('app.current_user_id', $1, true)`, coachID); err != nil {
		_ = tx.Rollback()
		db.Close()
		t.Skipf("skipping: cannot set the fixture RLS context: %v", err)
	}
	if _, err := tx.ExecContext(context.Background(),
		`INSERT INTO coaches (id, email, name, coach_code, is_active, created_at, updated_at)
		 VALUES ($1, $2, 'Invite Test Coach', $3, 1, NOW(), NOW())
		 ON CONFLICT (id) DO UPDATE SET coach_code = $3, is_active = 1`,
		coachID, coachID+"@example.com", code); err != nil {
		_ = tx.Rollback()
		db.Close()
		t.Skipf("skipping: cannot seed the coach fixture: %v", err)
	}
	if err := tx.Commit(); err != nil {
		db.Close()
		t.Skipf("skipping: cannot commit the fixture: %v", err)
	}

	cleanup := func() {
		_, _ = db.DB.ExecContext(context.Background(), `DELETE FROM coaches WHERE id = $1`, coachID)
		db.Close()
	}

	return NewRepository(db.DB), coachID, code, cleanup
}
