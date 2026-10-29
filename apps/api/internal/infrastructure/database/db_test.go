package database

import (
	"os"
	"testing"
)

func TestConnect_MissingURL(t *testing.T) {
	_, err := Connect("")
	if err == nil {
		t.Fatal("expected error when connecting with empty URL")
	}
}

func TestConnect_WithEnv(t *testing.T) {
	// Skip if no PostgreSQL credentials configured
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	db, err := Connect(url)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer db.Close()

	// Verify connection is alive
	if err := db.Ping(); err != nil {
		t.Fatalf("failed to ping database: %v", err)
	}
}

func TestConnect_InvalidURL(t *testing.T) {
	// Connect opens the connection lazily; Ping triggers the actual connection.
	// Use a scheme the driver doesn't recognize to force an error.
	db, err := Connect("invalid://nonexistent")
	if err != nil {
		// Connect itself failed (e.g., bad scheme)
		return
	}
	defer db.Close()
	// If Connect succeeded, Ping should fail for an invalid URL
	if err := db.Ping(); err == nil {
		t.Fatal("expected error when pinging invalid database")
	}
}
