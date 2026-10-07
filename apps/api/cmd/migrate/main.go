// Command migrate applies pending SQL migrations from the migrations
// directory to the configured database. It shares configuration with the API
// (same .env file and environment variables: DATABASE_URL/TURSO_URL and
// TURSO_AUTH_TOKEN) and can be pointed at any directory of .sql files,
// including /migrations inside the container image.
//
// Usage:
//
//	go run ./cmd/migrate [-dry-run] [-dir migrations]
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database/migrations"
)

func main() {
	dir := flag.String("dir", "migrations", "directory containing .sql migration files")
	dryRun := flag.Bool("dry-run", false, "list pending migrations without applying them")
	flag.Parse()

	url, token := config.DatabaseConnection()
	if url == "" {
		fatal("DATABASE_URL (or TURSO_URL) is required")
	}

	db, err := database.Connect(url, token)
	if err != nil {
		fatal("cannot connect to database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	if *dryRun {
		pending, err := migrations.Pending(ctx, db.DB, *dir)
		if err != nil {
			fatal("%v", err)
		}
		fmt.Printf("%d pending migration(s)\n", len(pending))
		for _, name := range pending {
			fmt.Printf("  %s\n", name)
		}
		return
	}

	res, err := migrations.Apply(ctx, db.DB, *dir, os.Stdout)
	if err != nil {
		fatal("%v", err)
	}
	fmt.Printf("%d migration(s) applied, 0 pending\n", len(res.Applied))
}

func fatal(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "migrate: "+format+"\n", args...)
	os.Exit(1)
}
