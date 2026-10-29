// Package database provides the database connection infrastructure for the MR Training API.
// It wraps database/sql with a PostgreSQL driver (pgx/v5/stdlib) and manages connection pooling.
package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// DB wraps sql.DB to provide application-level database operations.
// It embeds sql.DB so callers can use standard database/sql methods directly.
type DB struct {
	*sql.DB
}

// Connect establishes a connection to a PostgreSQL database.
// The url parameter should be a PostgreSQL connection URL (DATABASE_URL),
// e.g. postgres://user:pass@host:port/dbname?sslmode=disable.
//
// Connection pool settings are configured for typical API workloads:
//   - MaxOpenConns: 25
//   - MaxIdleConns: 5
//   - ConnMaxLifetime: 30 minutes
//   - ConnMaxIdleTime: 5 minutes
func Connect(url string) (*DB, error) {
	if url == "" {
		return nil, fmt.Errorf("database URL is required")
	}

	sqlDB, err := sql.Open("pgx", url)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Verify the connection is alive with a timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{sqlDB}, nil
}

// Close closes the database connection and releases any associated resources.
// It should be called during application shutdown.
func (db *DB) Close() error {
	return db.DB.Close()
}

// Ping verifies the database connection is still alive.
// It wraps sql.DB.Ping for convenience.
func (db *DB) Ping() error {
	return db.DB.Ping()
}
