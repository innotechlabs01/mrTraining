// Package database provides the database connection infrastructure for the MR Training API.
// It wraps database/sql with a Turso/libsql driver and manages connection pooling.
package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

// DB wraps sql.DB to provide application-level database operations.
// It embeds sql.DB so callers can use standard database/sql methods directly.
type DB struct {
	*sql.DB
}

// Connect establishes a connection to a Turso/libsql database.
// The url parameter should use the libsql:// protocol for remote databases
// or file: for local SQLite files. The authToken is required for remote
// connections and can be empty for local files.
//
// Connection pool settings are configured for typical API workloads:
//   - MaxOpenConns: 10 (conservative for serverless Turso)
//   - MaxIdleConns: 5
//   - ConnMaxLifetime: 5 minutes (Turso connections may expire)
//   - ConnMaxIdleTime: 3 minutes
func Connect(url, authToken string) (*DB, error) {
	if url == "" {
		return nil, fmt.Errorf("database URL is required")
	}

	// Build DSN with auth token for remote connections
	dsn := url
	if authToken != "" && len(url) > 8 && url[:8] == "libsql:" {
		dsn = url + "?authToken=" + authToken
	}

	sqlDB, err := sql.Open("libsql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(3 * time.Minute)

	// Verify the connection is alive
	if err := sqlDB.Ping(); err != nil {
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
