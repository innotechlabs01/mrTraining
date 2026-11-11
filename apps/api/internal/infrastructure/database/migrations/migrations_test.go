package migrations

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// newTestDB connects to a THROWAWAY PostgreSQL database dedicated to this
// test run.
//
// It used to connect to the shared development database and "reset" it by
// dropping the `users` table with CASCADE — which silently destroyed the
// real application data (and every table with a foreign key to it) whenever
// the suite was run. The test database is now created and dropped around the
// run, so it can never touch the development data.
func newTestDB(t *testing.T) *database.DB {
	t.Helper()

	adminURL := resolveAdminURL()
	admin, err := database.Connect(adminURL)
	if err != nil {
		t.Skipf("skipping: cannot connect to PostgreSQL: %v", err)
	}
	defer admin.Close()

	name := fmt.Sprintf("mr_training_migrations_test_%d_%s", os.Getpid(), randomSuffix())
	if _, err := admin.DB.ExecContext(context.Background(), fmt.Sprintf(`CREATE DATABASE %q`, name)); err != nil {
		t.Skipf("skipping: cannot create a test database: %v", err)
	}
	t.Cleanup(func() {
		// Terminate the leftover sessions so the database can be dropped.
		_, _ = admin.DB.ExecContext(context.Background(),
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, name)
		_, _ = admin.DB.ExecContext(context.Background(), fmt.Sprintf(`DROP DATABASE IF EXISTS %q`, name))
	})

	db, err := database.Connect(strings.Replace(adminURL, "/postgres?", "/"+name+"?", 1))
	if err != nil {
		t.Skipf("skipping: cannot connect to the test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	return db
}

// resolveAdminURL returns the superuser URL pointing at the maintenance
// database, so a fresh test database can be created.
func resolveAdminURL() string {
	url := os.Getenv("SUPER_DATABASE_URL")
	if url == "" {
		url = os.Getenv("POSTGRES_DATABASE_URL")
	}
	if url == "" {
		url = "postgresql://postgres:1e6819bd685e31fa529ed353f65bc6b6eb4d47f9f3e76c43@127.0.0.1:5435/mr_training_migration?sslmode=disable"
	}
	if i := strings.Index(url, "/postgres?"); i >= 0 {
		return url
	}
	if i := strings.Index(url, "?"); i >= 0 {
		return url[:i] + "/postgres" + url[i:]
	}
	return url + "/postgres"
}

// randomSuffix returns a short random identifier for the test database name.
func randomSuffix() string {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "xxxx"
	}
	return hex.EncodeToString(b[:])
}

func writeMigration(t *testing.T, dir, name, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
		t.Fatalf("write migration %s: %v", name, err)
	}
}

func TestApplyAndIdempotency(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "001_create_users.sql", `
-- users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'no;name' -- semicolon inside string literal
);
CREATE INDEX idx_users_name ON users(name);
`)
	writeMigration(t, dir, "002_create_posts.sql", "CREATE TABLE posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);")

	db := newTestDB(t)

	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if len(res.Applied) != 2 || res.Applied[0] != "001_create_users.sql" || res.Applied[1] != "002_create_posts.sql" {
		t.Fatalf("unexpected applied order: %v", res.Applied)
	}

	// Second run is a no-op.
	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}

	// Tracking rows exist for both migrations.
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE name IN ('001_create_users.sql','002_create_posts.sql')").Scan(&count); err != nil {
		t.Fatalf("count schema_migrations: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 tracking rows, got %d", count)
	}

	// Schema really applied and strings with semicolons survived the split.
	if err := db.QueryRow("INSERT INTO users (id, name) VALUES ('u1', 'no;name') RETURNING name").Scan(new(string)); err != nil {
		t.Fatalf("insert after migration: %v", err)
	}
}

func TestPending(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "001_a.sql", "CREATE TABLE a (id TEXT PRIMARY KEY);")
	writeMigration(t, dir, "002_b.sql", "CREATE TABLE b (id TEXT PRIMARY KEY);")

	db := newTestDB(t)
	if _, err := Apply(ctx, db.DB, dir, io.Discard); err != nil {
		t.Fatalf("apply: %v", err)
	}

	writeMigration(t, dir, "003_c.sql", "CREATE TABLE c (id TEXT PRIMARY KEY);")

	pending, err := Pending(ctx, db.DB, dir)
	if err != nil {
		t.Fatalf("pending: %v", err)
	}
	if len(pending) != 1 || pending[0] != "003_c.sql" {
		t.Fatalf("expected [003_c.sql] pending, got %v", pending)
	}
}

func TestApplyFailureNotMarkedApplied(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "001_good.sql", "CREATE TABLE good (id TEXT PRIMARY KEY);")
	writeMigration(t, dir, "002_bad.sql", "CREATE TABLE broken (id TEXT PRIMARY KEY;\nTHIS IS NOT SQL;")

	db := newTestDB(t)
	_, err := Apply(ctx, db.DB, dir, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "002_bad.sql") {
		t.Fatalf("expected error naming 002_bad.sql, got %v", err)
	}

	// Only 001 is recorded; 002 stays pending.
	var names []string
	rows, err := db.Query("SELECT name FROM schema_migrations WHERE name IN ('001_good.sql','002_bad.sql') ORDER BY name")
	if err != nil {
		t.Fatalf("query schema_migrations: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			t.Fatalf("scan: %v", err)
		}
		names = append(names, n)
	}
	if len(names) != 1 || names[0] != "001_good.sql" {
		t.Fatalf("expected only 001_good.sql applied, got %v", names)
	}

	pending, err := Pending(ctx, db.DB, dir)
	if err != nil {
		t.Fatalf("pending: %v", err)
	}
	if len(pending) != 1 || pending[0] != "002_bad.sql" {
		t.Fatalf("expected 002_bad.sql still pending, got %v", pending)
	}

	// The failed file left no partial table behind (transaction rolled back).
	var c int
	if err := db.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='broken'").Scan(&c); err != nil {
		t.Fatalf("check broken table: %v", err)
	}
	if c != 0 {
		t.Fatal("expected no partial table from failed migration")
	}
}

func TestSplitStatements(t *testing.T) {
	script := `
-- comment with ; semicolon
CREATE TABLE t (
    note TEXT DEFAULT 'a;b' /* block ; comment */,
    q TEXT DEFAULT 'it''s'
);
INSERT INTO t (note) VALUES ('x;y'); -- trailing
`
	got := SplitStatements(script)
	if len(got) != 2 {
		t.Fatalf("expected 2 statements, got %d: %v", len(got), got)
	}
	if !strings.Contains(got[0], "'a;b'") || !strings.Contains(got[0], "'it''s'") {
		t.Fatalf("string literals mangled: %q", got[0])
	}
	if !strings.Contains(got[1], "'x;y'") {
		t.Fatalf("second statement mangled: %q", got[1])
	}
}
