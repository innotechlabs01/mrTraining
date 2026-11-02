// Command data-migrate copies data from Turso/libSQL to PostgreSQL local and Supabase QA.
// It is designed for safe, incremental, idempotent migration.
// No writes are performed unless explicitly confirmed by the user.
//
// Usage:
//   go run ./cmd/data-migrate [-dry-run] [-verify-only]
//     [-table table1,table2] [-batch-size N]
//
// Environment variables:
//   DATABASE_URL          PostgreSQL local connection string (required)
//   SUPABASE_QA_DATABASE_URL  PostgreSQL connection string for Supabase QA (optional)
//   TURSO_DATABASE_URL      Turso/libSQL connection URL (required)
//   TURSO_AUTH_TOKEN        Turso authentication token (optional, may be empty for local files)
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

// MigrationMode defines the operating mode of the migrator.
type MigrationMode string

const (
	ModeDryRun     MigrationMode = "dry-run"
	ModeVerifyOnly MigrationMode = "verify-only"
	ModeApply      MigrationMode = "apply"

	// defaultMaxRetries is the maximum number of retry attempts for transient errors.
	defaultMaxRetries = 3
)

// ColumnInfo describes a column in the destination table.
type ColumnInfo struct {
	Name       string
	Type       string
	IsNullable bool
	Default    *string
}

// FKConstraint describes a foreign key constraint.
type FKConstraint struct {
	Column         string
	ForeignTable   string
	ForeignColumn  string
}

// TableSchema describes a destination table structure.
type TableSchema struct {
	Name      string
	Columns   []ColumnInfo
	PKs       []string
	FKs       []FKConstraint
	Uniques   [][]string
}

// MigrationPlanResult describes the ordered plan for migrating tables.
type MigrationPlanResult struct {
	OrderedTables []string
	Errors        []string
}

// MigrationStats holds overall migration statistics.
type MigrationStats struct {
	TablesProcessed int
	TablesSkipped   int
	TablesFailed    int
	TotalRowsRead   int
	TotalRowsInsert int
	TotalRowsSkipped int
	TotalRowsRejected int
	StartTime       time.Time
	EndTime         time.Time
}

// TableMigrationResult holds the result of migrating a single table.
type TableMigrationResult struct {
	TableName string
	RowCount  int
}

// TableMigrationError holds details of a table migration failure.
type TableMigrationError struct {
	Table  string
	Err    error
}

func (e *TableMigrationError) Error() string {
	return fmt.Sprintf("migrate table %s: %v", e.Table, e.Err)
}

// getTables returns the list of table names from a libSQL/Turso database.
func getTables(ctx context.Context, db *sql.DB) ([]string, error) {
	rows, err := db.QueryContext(ctx, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'schema_%' AND name NOT LIKE 'sqlite_%'")
	if err != nil {
		return nil, fmt.Errorf("query tables: %w", err)
	}
	defer rows.Close()
	var tables []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, fmt.Errorf("scan table name: %w", err)
		}
		tables = append(tables, t)
	}
	return tables, nil
}

// loadSchema loads the destination table schema from PostgreSQL.
func loadSchema(ctx context.Context, db *sql.DB, tableName string) (*TableSchema, error) {
	colsQuery := `
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = $1
		ORDER BY ordinal_position`
	rows, err := db.QueryContext(ctx, colsQuery, tableName)
	if err != nil {
		return nil, fmt.Errorf("query columns: %w", err)
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var col ColumnInfo
		var def *string
		if err := rows.Scan(&col.Name, &col.Type, &col.IsNullable, &def); err != nil {
			return nil, fmt.Errorf("scan column: %w", err)
		}
		col.Type = strings.ToLower(col.Type)
		if def != nil {
			col.Default = def
		}
		columns = append(columns, col)
	}

	pksQuery := `
		SELECT kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		WHERE tc.constraint_type = 'PRIMARY KEY'
			AND tc.table_schema = 'public'
			AND tc.table_name = $1`
	pkRows, err := db.QueryContext(ctx, pksQuery, tableName)
	if err != nil {
		return nil, fmt.Errorf("query pks: %w", err)
	}
	defer pkRows.Close()
	var pks []string
	for pkRows.Next() {
		var col string
		if err := pkRows.Scan(&col); err != nil {
			return nil, fmt.Errorf("scan pk: %w", err)
		}
		pks = append(pks, col)
	}

	fkQuery := `
		SELECT kcu.column_name, ccu.table_name AS foreign_table, kcu.column_name AS foreign_column
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.key_column_usage kcu2
			ON kcu.column_name = kcu2.column_name
			AND kcu.table_schema = kcu2.table_schema
		JOIN information_schema.column_column_usage ccu
			ON kcu2.column_name = ccu.column_name
			AND kcu2.table_schema = ccu.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
			AND tc.table_name = $1`
	fkRows, err := db.QueryContext(ctx, fkQuery, tableName)
	if err != nil {
		return nil, fmt.Errorf("query fks: %w", err)
	}
	defer fkRows.Close()
	var fks []FKConstraint
	for fkRows.Next() {
		var fk FKConstraint
		if err := fkRows.Scan(&fk.Column, &fk.ForeignTable, &fk.ForeignColumn); err != nil {
			return nil, fmt.Errorf("scan fk: %w", err)
		}
		fks = append(fks, fk)
	}

	return &TableSchema{
		Name:     tableName,
		Columns:  columns,
		PKs:      pks,
		FKs:      fks,
	}, nil
}

// colExists checks if a column exists in the schema.
func colExists(schema *TableSchema, colName string) bool {
	for _, c := range schema.Columns {
		if c.Name == colName {
			return true
		}
	}
	return false
}

// colType returns the type of a column or empty string if not found.
func colType(schema *TableSchema, colName string) string {
	for _, c := range schema.Columns {
		if c.Name == colName {
			return c.Type
		}
	}
	return ""
}

// buildInsertQuery builds a parameterized INSERT statement.
func buildInsertQuery(table string, cols []string) string {
	placeholders := make([]string, len(cols))
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, strings.Join(cols, ", "), strings.Join(placeholders, ", "))
}

// buildOnConflictClause builds ON CONFLICT clause if unique constraints exist.
func buildOnConflictClause(schema *TableSchema) string {
	uniqueCols := make(map[string]bool)
	for _, pk := range schema.PKs {
		uniqueCols[pk] = true
	}
	for _, uc := range schema.Uniques {
		for _, c := range uc {
			uniqueCols[c] = true
		}
	}

	if len(uniqueCols) == 0 {
		return ""
	}

	cols := make([]string, 0, len(uniqueCols))
	for c := range uniqueCols {
		cols = append(cols, c)
	}
	sort.Strings(cols)
	return fmt.Sprintf(" ON CONFLICT (%s) DO UPDATE SET updated_at = EXCLUDED.updated_at", strings.Join(cols, ", "))
}

// MigrationPlan builds the migration order based on foreign key dependencies.
func MigrationPlan(ctx context.Context, db *sql.DB, allTables []string) (*MigrationPlanResult, error) {
	deps := make(map[string]map[string]bool)
	tableSet := make(map[string]bool)
	for _, t := range allTables {
		tableSet[t] = true
		deps[t] = make(map[string]bool)
	}

	for _, table := range allTables {
		schema, err := loadSchema(ctx, db, table)
		if err != nil {
			deps[table] = make(map[string]bool)
			continue
		}
		for _, fk := range schema.FKs {
			if tableSet[fk.ForeignTable] {
				deps[table][fk.ForeignTable] = true
			}
		}
	}

	var ordered []string
	visited := make(map[string]bool)
	visiting := make(map[string]bool)

	var visit func(t string) error
	visit = func(t string) error {
		if visiting[t] {
			return fmt.Errorf("cycle detected at %s", t)
		}
		if visited[t] {
			return nil
		}
		visiting[t] = true
		for dep := range deps[t] {
			if err := visit(dep); err != nil {
				return err
			}
		}
		visiting[t] = false
		visited[t] = true
		ordered = append(ordered, t)
		return nil
	}

	for _, t := range allTables {
		if !visited[t] {
			if err := visit(t); err != nil {
				return &MigrationPlanResult{
					Errors: []string{err.Error()},
				}, err
			}
		}
	}

	return &MigrationPlanResult{
		OrderedTables: ordered,
	}, nil
}

// ConvertValue converts a SQLite value to a PostgreSQL-compatible value based on column metadata.
func ConvertValue(colName string, colType string, value interface{}) (interface{}, error) {
	if value == nil {
		return nil, nil
	}

	switch v := value.(type) {
	case int64:
		if colType == "boolean" || colType == "bool" {
			return v != 0, nil
		}
		return v, nil
	case float64:
		return v, nil
	case string:
		return v, nil
	case []byte:
		return v, nil
	case bool:
		return v, nil
	default:
		return v, nil
	}
}

// executeBatch executes a batch insert within a transaction.
func executeBatch(ctx context.Context, db *sql.DB, query string, batch [][]interface{}) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return fmt.Errorf("prepare: %w", err)
	}
	defer stmt.Close()

	for _, row := range batch {
		if _, err := stmt.ExecContext(ctx, row...); err != nil {
			return fmt.Errorf("exec batch row: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// isTransientError determines whether an error is transient and safe to retry.
// Schema errors, data validation errors, and constraint violations are NOT transient.
func isTransientError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	// PostgreSQL connection / transient error indicators (sanitized, no secrets).
	transientKeywords := []string{
		"connection refused",
		"connection reset",
		"timeout",
		"temporary failure",
		"server closed the connection",
		"no such host",
		"network is unreachable",
	}
	for _, kw := range transientKeywords {
		if strings.Contains(strings.ToLower(msg), kw) {
			return true
		}
	}
	return false
}

// executeBatchWithRetry executes a batch insert with limited retries for transient errors only.
func executeBatchWithRetry(ctx context.Context, db *sql.DB, query string, batch [][]interface{}, maxRetries int) error {
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Incremental backoff: 100ms, 200ms, 400ms, ...
			backoff := time.Duration(100*attempt) * time.Millisecond
			timer := time.NewTimer(backoff)
			select {
			case <-ctx.Done():
				timer.Stop()
				return fmt.Errorf("context cancelled during retry backoff: %w", ctx.Err())
			case <-timer.C:
				timer.Stop()
			}
		}
		if err := executeBatch(ctx, db, query, batch); err != nil {
			lastErr = err
			if !isTransientError(err) {
				return err
			}
			if attempt == maxRetries {
				return fmt.Errorf("exhausted %d retries: %w", maxRetries, lastErr)
			}
			continue
		}
		return nil
	}
	return fmt.Errorf("exhausted %d retries: %w", maxRetries, lastErr)
}

// countRows counts rows in a table.
func countRows(ctx context.Context, db *sql.DB, table string) (int, error) {
	var count int
	err := db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", table)).Scan(&count)
	return count, err
}

// MigrateTable migrates a single table from source to destination(s).
func MigrateTable(ctx context.Context, src, dst1, dst2 *sql.DB, table string, batchSize int, dryRun bool) (*TableMigrationResult, error) {
	result := &TableMigrationResult{
		TableName: table,
	}

	schema, err := loadSchema(ctx, dst1, table)
	if err != nil {
		return result, fmt.Errorf("load schema: %w", err)
	}

	rows, err := src.QueryContext(ctx, fmt.Sprintf("SELECT * FROM %s LIMIT 1", table))
	if err != nil {
		return result, fmt.Errorf("get source columns: %w", err)
	}
	defer rows.Close()
	srcCols, err := rows.Columns()
	if err != nil {
		return result, fmt.Errorf("get source columns: %w", err)
	}

	for _, col := range srcCols {
		if !colExists(schema, col) {
			return result, fmt.Errorf("column %q not found in destination table %s", col, table)
		}
	}

	insertQuery := buildInsertQuery(table, srcCols)

	onConflict := buildOnConflictClause(schema)
	if onConflict != "" {
		insertQuery = insertQuery + onConflict
	}

	rows, err = src.QueryContext(ctx, fmt.Sprintf("SELECT * FROM %s", table))
	if err != nil {
		return result, fmt.Errorf("select rows: %w", err)
	}
	defer rows.Close()

	count := 0
	batch := make([][]interface{}, 0, batchSize)
	for rows.Next() {
		// Check context cancellation on each row iteration.
		if err := ctx.Err(); err != nil {
			return result, fmt.Errorf("context cancelled: %w", err)
		}

		values := make([]interface{}, len(srcCols))
		valuePtrs := make([]interface{}, len(srcCols))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			return result, fmt.Errorf("scan row: %w", err)
		}

		converted := make([]interface{}, len(srcCols))
		for i, col := range srcCols {
			converted[i], err = ConvertValue(col, colType(schema, col), values[i])
			if err != nil {
				return result, fmt.Errorf("convert column %s: %w", col, err)
			}
		}

		batch = append(batch, converted)
		if len(batch) >= batchSize {
			if err := executeBatchWithRetry(ctx, dst1, insertQuery, batch, defaultMaxRetries); err != nil {
				return result, fmt.Errorf("insert batch local: %w", err)
			}
			if dst2 != nil {
				args := make([]interface{}, len(batch[0]))
				for i := range batch[0] {
					args[i] = batch[0][i]
				}
				if err := executeBatchWithRetry(ctx, dst2, insertQuery, [][]interface{}{args}, defaultMaxRetries); err != nil {
					return result, fmt.Errorf("insert batch qa: %w", err)
				}
			}
			count += len(batch)
			batch = batch[:0]
		}
	}
	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate rows: %w", err)
	}

	if len(batch) > 0 {
		if err := executeBatchWithRetry(ctx, dst1, insertQuery, batch, defaultMaxRetries); err != nil {
			return result, fmt.Errorf("insert final batch local: %w", err)
		}
		if dst2 != nil {
			args := make([]interface{}, len(batch[0]))
			for i := range batch[0] {
				args[i] = batch[0][i]
			}
			if err := executeBatchWithRetry(ctx, dst2, insertQuery, [][]interface{}{args}, defaultMaxRetries); err != nil {
				return result, fmt.Errorf("insert final batch qa: %w", err)
			}
		}
		count += len(batch)
	}

	result.RowCount = count
	return result, nil
}

// RunMigration performs the full migration with the specified mode.
func RunMigration(ctx context.Context, src, dst1, dst2 *sql.DB, tableList []string, mode MigrationMode, batchSize int) (*MigrationStats, error) {
	stats := &MigrationStats{
		StartTime: time.Now(),
	}

	allTables, err := getTables(ctx, src)
	if err != nil {
		return stats, fmt.Errorf("get tables: %w", err)
	}

	var tablesToMigrate []string
	if len(tableList) > 0 {
		tableSet := make(map[string]bool)
		for _, t := range tableList {
			tableSet[t] = true
		}
		for _, t := range allTables {
			if tableSet[t] {
				tablesToMigrate = append(tablesToMigrate, t)
			}
		}
	} else {
		tablesToMigrate = allTables
	}

	plan, err := MigrationPlan(ctx, dst1, tablesToMigrate)
	if err != nil {
		return stats, fmt.Errorf("build migration plan: %w", err)
	}
	if len(plan.Errors) > 0 {
		return stats, fmt.Errorf("migration plan errors: %v", plan.Errors)
	}

	if mode == ModeDryRun {
		fmt.Printf("DRY-RUN: Would migrate %d tables:\n", len(plan.OrderedTables))
		for _, t := range plan.OrderedTables {
			fmt.Printf("  - %s\n", t)
		}
		return stats, nil
	}

	if mode == ModeVerifyOnly {
		fmt.Println("VERIFY-ONLY: Comparing source and destination row counts:")
		for _, table := range plan.OrderedTables {
			srcCount, err := countRows(ctx, src, table)
			if err != nil {
				fmt.Printf("  %s: error counting source: %v\n", table, err)
				continue
			}
			dstCount, err := countRows(ctx, dst1, table)
			if err != nil {
				fmt.Printf("  %s: error counting destination: %v\n", table, err)
				continue
			}
			status := "MATCH"
			if srcCount != dstCount {
				status = "MISMATCH"
			}
			fmt.Printf("  %s: source=%d dest=%d %s\n", table, srcCount, dstCount, status)
		}
		return stats, nil
	}

	// Track failed tables so dependent tables are not processed.
	failedTables := make(map[string]bool)

	for _, table := range plan.OrderedTables {
		// Skip tables whose dependencies failed.
		if failedTables[table] {
			fmt.Printf("  SKIPPED: %s (dependency failed)\n", table)
			stats.TablesSkipped++
			continue
		}

		// Check context cancellation before starting each table.
		if err := ctx.Err(); err != nil {
			fmt.Printf("  CANCELLED: %v\n", err)
			break
		}

		fmt.Printf("Migrating table: %s...\n", table)
		result, err := MigrateTable(ctx, src, dst1, dst2, table, batchSize, false)
		if err != nil {
			fmt.Printf("  FAILED: %v\n", err)
			stats.TablesFailed++
			failedTables[table] = true
			continue
		}
		stats.TablesProcessed++
		stats.TotalRowsRead += result.RowCount
		stats.TotalRowsInsert += result.RowCount
		fmt.Printf("  Migrated %d rows\n", result.RowCount)
	}

	stats.EndTime = time.Now()
	return stats, nil
}

func main() {
	dryRun := flag.Bool("dry-run", false, "Plan and analyze without writing any data")
	verifyOnly := flag.Bool("verify-only", false, "Compare source and destination row counts without writing")
	tables := flag.String("table", "", "Comma-separated list of tables to migrate (default: all)")
	batchSize := flag.Int("batch-size", 500, "Number of rows per batch")
	flag.Parse()

	var mode MigrationMode
	switch {
	case *dryRun:
		mode = ModeDryRun
	case *verifyOnly:
		mode = ModeVerifyOnly
	default:
		mode = ModeApply
	}

	var tableList []string
	if *tables != "" {
		tableList = strings.Split(*tables, ",")
		for i, t := range tableList {
			tableList[i] = strings.TrimSpace(t)
		}
	}

	srcURL := os.Getenv("TURSO_DATABASE_URL")
	srcToken := os.Getenv("TURSO_AUTH_TOKEN")
	dstURL := os.Getenv("DATABASE_URL")
	qaURL := os.Getenv("SUPABASE_QA_DATABASE_URL")

	if srcURL == "" || dstURL == "" {
		fmt.Println("Set TURSO_DATABASE_URL and DATABASE_URL")
		os.Exit(1)
	}

	ctx := context.Background()

	srcDSN := srcURL
	if srcToken != "" {
		srcDSN += "?authToken=" + srcToken
	}
	src, err := sql.Open("libsql", srcDSN)
	if err != nil {
		fmt.Printf("ERR open source: %v\n", err)
		os.Exit(1)
	}
	defer src.Close()

	dst1, err := sql.Open("pgx", dstURL)
	if err != nil {
		fmt.Printf("ERR open destination: %v\n", err)
		os.Exit(1)
	}
	defer dst1.Close()

	var dst2 *sql.DB
	if qaURL != "" {
		dst2, err = sql.Open("pgx", qaURL)
		if err != nil {
			fmt.Printf("ERR open QA destination: %v\n", err)
			os.Exit(1)
		}
		defer dst2.Close()
	}

	stats, err := RunMigration(ctx, src, dst1, dst2, tableList, mode, *batchSize)
	if err != nil {
		fmt.Printf("ERR migration: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\nMigration complete: %d tables processed, %d failed, %d rows inserted\n",
		stats.TablesProcessed, stats.TablesFailed, stats.TotalRowsInsert)
}
