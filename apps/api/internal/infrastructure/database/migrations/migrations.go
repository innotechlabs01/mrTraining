// Package migrations provides a minimal SQL migration runner for the
// MR Training API. It applies files from a migrations directory in
// lexicographic order (001_…, 002_…, …) and records each applied file in a
// schema_migrations tracking table, which makes every run idempotent.
package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "modernc.org/sqlite" // enable file: local SQLite URLs via the libsql driver's file fallback
)

// trackingTableDDL creates the table that records applied migrations.
const trackingTableDDL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

// Result summarises one Apply run.
type Result struct {
	Applied []string // migration files applied during this run, in order
	Pending []string // migration files still pending (non-empty only on dry runs)
}

// List returns the .sql migration files in dir, sorted lexicographically.
func List(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("cannot read migrations directory %q: %w", dir, err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	return files, nil
}

// Pending returns the migration files in dir that have not been applied yet.
func Pending(ctx context.Context, db *sql.DB, dir string) ([]string, error) {
	if err := ensureTrackingTable(ctx, db); err != nil {
		return nil, err
	}
	applied, err := appliedSet(ctx, db)
	if err != nil {
		return nil, err
	}
	files, err := List(dir)
	if err != nil {
		return nil, err
	}
	var pending []string
	for _, f := range files {
		if !applied[f] {
			pending = append(pending, f)
		}
	}
	return pending, nil
}

// Apply executes every pending migration in dir, in lexicographic order.
// Each file runs inside a transaction together with its tracking-row insert,
// so a failure leaves no partial state and the file is not marked applied.
// Progress is written to out when out is not nil.
func Apply(ctx context.Context, db *sql.DB, dir string, out io.Writer) (*Result, error) {
	pending, err := Pending(ctx, db, dir)
	if err != nil {
		return nil, err
	}
	res := &Result{Pending: pending}
	for _, name := range pending {
		if err := applyFile(ctx, db, dir, name); err != nil {
			return res, err
		}
		res.Applied = append(res.Applied, name)
		if out != nil {
			fmt.Fprintf(out, "applied %s\n", name)
		}
	}
	res.Pending = nil // everything pending is now applied
	return res, nil
}

// applyFile runs a single migration file inside a transaction and records it.
func applyFile(ctx context.Context, db *sql.DB, dir, name string) error {
	raw, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil {
		return fmt.Errorf("migration %s: read failed: %w", name, err)
	}
	stmts := SplitStatements(string(raw))

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("migration %s: begin transaction failed: %w", name, err)
	}
	defer tx.Rollback() // no-op after Commit

	for _, stmt := range stmts {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("migration %s: %w\nstatement: %s", name, err, stmt)
		}
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (name) VALUES (?)", name); err != nil {
		return fmt.Errorf("migration %s: record applied failed: %w", name, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("migration %s: commit failed: %w", name, err)
	}
	return nil
}

// ensureTrackingTable creates schema_migrations when missing.
func ensureTrackingTable(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, trackingTableDDL); err != nil {
		return fmt.Errorf("cannot create schema_migrations table: %w", err)
	}
	return nil
}

// appliedSet returns the set of migration names already recorded.
func appliedSet(ctx context.Context, db *sql.DB) (map[string]bool, error) {
	rows, err := db.QueryContext(ctx, "SELECT name FROM schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("cannot read schema_migrations: %w", err)
	}
	defer rows.Close()
	set := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("cannot scan schema_migrations: %w", err)
		}
		set[name] = true
	}
	return set, rows.Err()
}

// SplitStatements splits a SQL script into statements at top-level
// semicolons. Semicolons inside single-quoted strings (with '' escaping),
// -- line comments, and /* */ block comments are ignored, and semicolons
// inside them do not split the script.
func SplitStatements(script string) []string {
	var stmts []string
	var cur strings.Builder
	inString := false

	i := 0
	for i < len(script) {
		c := script[i]

		if inString {
			cur.WriteByte(c)
			switch c {
			case '\'':
				if i+1 < len(script) && script[i+1] == '\'' { // escaped quote
					cur.WriteByte(script[i+1])
					i++
				} else {
					inString = false
				}
			}
			i++
			continue
		}

		switch {
		case c == '\'':
			inString = true
			cur.WriteByte(c)
			i++
		case c == '-' && i+1 < len(script) && script[i+1] == '-':
			for i < len(script) && script[i] != '\n' { // skip line comment
				i++
			}
		case c == '/' && i+1 < len(script) && script[i+1] == '*':
			i += 2
			for i+1 < len(script) && !(script[i] == '*' && script[i+1] == '/') { // skip block comment
				i++
			}
			i += 2
		case c == ';':
			if s := strings.TrimSpace(cur.String()); s != "" {
				stmts = append(stmts, s)
			}
			cur.Reset()
			i++
		default:
			cur.WriteByte(c)
			i++
		}
	}
	if s := strings.TrimSpace(cur.String()); s != "" {
		stmts = append(stmts, s)
	}
	return stmts
}
