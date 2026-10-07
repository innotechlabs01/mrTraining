package migrations

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// newTestDB connects to a throwaway local SQLite file (the same file: path
// the libsql driver delegates to the modernc.org/sqlite driver).
func newTestDB(t *testing.T) *database.DB {
	t.Helper()
	path := filepath.Join(t.TempDir(), "test.db")
	db, err := database.Connect("file:"+path, "")
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
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
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
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
	rows, err := db.Query("SELECT name FROM schema_migrations ORDER BY name")
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
	if err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='broken'").Scan(&c); err != nil {
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
