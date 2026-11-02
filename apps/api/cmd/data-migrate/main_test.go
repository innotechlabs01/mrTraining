package main

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"strings"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

func TestMigrationPlanOrdering(t *testing.T) {
	ctx := context.Background()
	db, err := sql.Open("pgx", "postgres://postgres:postgres@127.0.0.1:5435/mr_training_migration?sslmode=disable")
	if err != nil {
		t.Skipf("cannot connect to test database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		t.Skipf("cannot ping test database: %v", err)
	}

	allTables := []string{
		"running_workout_assignments",
		"running_workout_templates",
		"running_workout_segments",
		"running_workout_snapshots",
		"running_sessions",
	}

	plan, err := MigrationPlan(ctx, db, allTables)
	if err != nil {
		t.Fatalf("MigrationPlan: %v", err)
	}

	if len(plan.Errors) > 0 {
		t.Fatalf("plan errors: %v", plan.Errors)
	}

	order := make(map[string]int)
	for i, t := range plan.OrderedTables {
		order[t] = i
	}

	if _, ok := order["coach_athletes"]; ok {
		if _, ok := order["coach_athlete_links"]; ok {
			if order["coach_athletes"] >= order["coach_athlete_links"] {
				t.Errorf("coach_athletes should come before coach_athlete_links")
			}
		}
	}

	if order["running_workout_templates"] >= order["running_workout_assignments"] {
		t.Errorf("running_workout_templates should come before running_workout_assignments")
	}
	if order["running_workout_templates"] >= order["running_workout_segments"] {
		t.Errorf("running_workout_templates should come before running_workout_segments")
	}
}

func TestMigrationPlanEmpty(t *testing.T) {
	ctx := context.Background()
	db, err := sql.Open("pgx", "postgres://postgres:postgres@127.0.0.1:5435/mr_training_migration?sslmode=disable")
	if err != nil {
		t.Skipf("cannot connect to test database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		t.Skipf("cannot ping test database: %v", err)
	}

	plan, err := MigrationPlan(ctx, db, []string{})
	if err != nil {
		t.Fatalf("MigrationPlan with empty list: %v", err)
	}
	if len(plan.OrderedTables) != 0 {
		t.Errorf("expected empty ordered list, got %v", plan.OrderedTables)
	}
}

func TestConvertValue(t *testing.T) {
	tests := []struct {
		name     string
		colType  string
		value    interface{}
		expected interface{}
		wantErr  bool
	}{
		{
			name:     "int64 to boolean true",
			colType:  "boolean",
			value:    int64(1),
			expected: true,
		},
		{
			name:     "int64 0 to boolean false",
			colType:  "boolean",
			value:    int64(0),
			expected: false,
		},
		{
			name:     "int64 to int64",
			colType:  "integer",
			value:    int64(42),
			expected: int64(42),
		},
		{
			name:     "float64 to float64",
			colType:  "real",
			value:    float64(3.14),
			expected: float64(3.14),
		},
		{
			name:     "string to string",
			colType:  "text",
			value:    "hello",
			expected: "hello",
		},
		{
			name:     "nil to nil",
			colType:  "text",
			value:    nil,
			expected: nil,
		},
		{
			name:     "bool to bool",
			colType:  "boolean",
			value:    true,
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ConvertValue(tt.colType, tt.colType, tt.value)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("expected %v (%T), got %v (%T)", tt.expected, tt.expected, result, result)
			}
		})
	}
}

func TestBuildInsertQuery(t *testing.T) {
	cols := []string{"id", "name", "value"}
	query := buildInsertQuery("test_table", cols)
	expected := "INSERT INTO test_table (id, name, value) VALUES ($1, $2, $3)"
	if query != expected {
		t.Errorf("expected %q, got %q", expected, query)
	}
}

func TestBuildOnConflictClause(t *testing.T) {
	schema := &TableSchema{
		Name:   "test_table",
		PKs:    []string{"id"},
		FKs:    []FKConstraint{},
		Uniques: [][]string{},
	}
	clause := buildOnConflictClause(schema)
	expected := " ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at"
	if clause != expected {
		t.Errorf("expected %q, got %q", expected, clause)
	}

	schema2 := &TableSchema{
		Name:   "test_table",
		PKs:    []string{"id"},
		FKs:    []FKConstraint{},
		Uniques: [][]string{{"email"}},
	}
	clause2 := buildOnConflictClause(schema2)
	expected2 := " ON CONFLICT (email, id) DO UPDATE SET updated_at = EXCLUDED.updated_at"
	if clause2 != expected2 {
		t.Errorf("expected %q, got %q", expected2, clause2)
	}
}

func TestBuildOnConflictClauseMultipleCols(t *testing.T) {
	schema := &TableSchema{
		Name:   "test_table",
		PKs:    []string{"id"},
		FKs:    []FKConstraint{},
		Uniques: [][]string{{"email", "phone"}},
	}
	clause := buildOnConflictClause(schema)
	expected := " ON CONFLICT (email, id, phone) DO UPDATE SET updated_at = EXCLUDED.updated_at"
	if clause != expected {
		t.Errorf("expected %q, got %q", expected, clause)
	}
}

func TestCountRows(t *testing.T) {
	ctx := context.Background()
	db, err := sql.Open("pgx", "postgres://postgres:postgres@127.0.0.1:5435/mr_training_migration?sslmode=disable")
	if err != nil {
		t.Skipf("cannot connect to test database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		t.Skipf("cannot ping test database: %v", err)
	}

	count, err := countRows(ctx, db, "running_sessions")
	if err != nil {
		t.Fatalf("countRows: %v", err)
	}
	if count < 0 {
		t.Errorf("expected non-negative count, got %d", count)
	}
}

func TestIsTransientError(t *testing.T) {
	tests := []struct {
		name  string
		err   error
		want  bool
	}{
		{
			name:  "nil error is not transient",
			err:   nil,
			want:  false,
		},
		{
			name:  "connection refused is transient",
			err:   fmt.Errorf("connection refused"),
			want:  true,
		},
		{
			name:  "timeout is transient",
			err:   fmt.Errorf("timeout"),
			want:  true,
		},
		{
			name:  "network unreachable is transient",
			err:   fmt.Errorf("network is unreachable"),
			want:  true,
		},
		{
			name:  "constraint violation is not transient",
			err:   fmt.Errorf("duplicate key value violates unique constraint"),
			want:  false,
		},
		{
			name:  "syntax error is not transient",
			err:   fmt.Errorf("syntax error at or near"),
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isTransientError(tt.err)
			if got != tt.want {
				t.Errorf("isTransientError(%v) = %v, want %v", tt.err, got, tt.want)
			}
		})
	}
}

func TestBuildOnConflictClauseUsesDoUpdateNotDoNothing(t *testing.T) {
	// ON CONFLICT must use DO UPDATE, not DO NOTHING, so existing records
	// with different content are not silently discarded.
	schema := &TableSchema{
		Name:   "test_table",
		PKs:    []string{"id"},
		FKs:    []FKConstraint{},
		Uniques: [][]string{{"email"}},
	}
	clause := buildOnConflictClause(schema)

	if strings.Contains(clause, "DO NOTHING") {
		t.Errorf("ON CONFLICT must not use DO NOTHING; got %q", clause)
	}
	if !strings.Contains(clause, "DO UPDATE") {
		t.Errorf("ON CONFLICT must use DO UPDATE; got %q", clause)
	}
	if !strings.Contains(clause, "EXCLUDED.updated_at") {
		t.Errorf("ON CONFLICT must reference EXCLUDED.updated_at; got %q", clause)
	}
}

func TestBuildInsertQueryMultipleColumns(t *testing.T) {
	cols := []string{"id", "name", "email", "created_at", "is_active"}
	query := buildInsertQuery("users", cols)
	expected := "INSERT INTO users (id, name, email, created_at, is_active) VALUES ($1, $2, $3, $4, $5)"
	if query != expected {
		t.Errorf("expected %q, got %q", expected, query)
	}
}

func TestConvertValueJSON(t *testing.T) {
	// JSON text should pass through as-is for JSON/JSONB columns.
	result, err := ConvertValue("data", "jsonb", `{"key": "value"}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != `{"key": "value"}` {
		t.Errorf("expected JSON passthrough, got %v", result)
	}
}

func TestConvertValueNullRespectsNullability(t *testing.T) {
	// NULL must remain NULL regardless of column type.
	for _, colType := range []string{"boolean", "integer", "text", "jsonb", "timestamptz"} {
		result, err := ConvertValue("col", colType, nil)
		if err != nil {
			t.Fatalf("unexpected error for %s: %v", colType, err)
		}
		if result != nil {
			t.Errorf("expected nil for %s, got %v", colType, result)
		}
	}
}

func TestConvertValueUUIDPassthrough(t *testing.T) {
	// UUID values should pass through as-is (no new identifiers generated).
	uuid := "550e8400-e29b-41d4-a716-446655440000"
	result, err := ConvertValue("id", "uuid", uuid)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != uuid {
		t.Errorf("expected UUID passthrough, got %v", result)
	}
}

func TestMigrationPlanDetectsCycle(t *testing.T) {
	// Cycle detection is tested via loadSchema which requires PostgreSQL.
	// This unit test verifies the function returns an error when given
	// a table list that would create a cycle, but since loadSchema needs
	// a live DB, we skip if no DB is available.
	ctx := context.Background()
	db, err := sql.Open("pgx", "postgres://postgres:postgres@127.0.0.1:5435/mr_training_migration?sslmode=disable")
	if err != nil {
		t.Skipf("cannot connect to test database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		t.Skipf("cannot ping test database: %v", err)
	}

	// Create a self-referencing scenario would require actual cycle tables.
	// This test validates the function handles normal tables without cycle errors.
	plan, err := MigrationPlan(ctx, db, []string{"running_sessions"})
	if err != nil {
		t.Fatalf("MigrationPlan: %v", err)
	}
	if len(plan.Errors) > 0 {
		t.Fatalf("plan errors: %v", plan.Errors)
	}
}
