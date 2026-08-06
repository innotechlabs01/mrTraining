package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/pkg/config"
	"github.com/mrtraining/backend/pkg/logger"
)

func main() {
	var (
		action   = flag.String("action", "up", "Migration action: up, down, force, version")
		steps    = flag.Int("steps", 0, "Number of steps for up/down (0 = all)")
		forceVer = flag.Int("force", -1, "Force version (for dirty database)")
	)
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Config error: %v\n", err)
		os.Exit(1)
	}

	log := logger.New("migrate", cfg.Environment)
	ctx := context.Background()

	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer dbPool.Close()

	migrationsPath := "file://migrations"
	m, err := migrate.New(migrationsPath, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create migrate instance")
	}
	defer m.Close()

	switch *action {
	case "up":
		if *steps > 0 {
			if err := m.Steps(*steps); err != nil && err != migrate.ErrNoChange {
				log.Fatal().Err(err).Msg("Migration up failed")
			}
		} else {
			if err := m.Up(); err != nil && err != migrate.ErrNoChange {
				log.Fatal().Err(err).Msg("Migration up failed")
			}
		}
		log.Info().Msg("Migrations applied successfully")

	case "down":
		if *steps > 0 {
			if err := m.Steps(-*steps); err != nil && err != migrate.ErrNoChange {
				log.Fatal().Err(err).Msg("Migration down failed")
			}
		} else {
			if err := m.Down(); err != nil && err != migrate.ErrNoChange {
				log.Fatal().Err(err).Msg("Migration down failed")
			}
		}
		log.Info().Msg("Migrations rolled back successfully")

	case "force":
		if *forceVer < 0 {
			log.Fatal().Msg("Force version required")
		}
		if err := m.Force(*forceVer); err != nil {
			log.Fatal().Err(err).Msg("Force version failed")
		}
		log.Info().Int("version", *forceVer).Msg("Forced migration version")

	case "version":
		version, dirty, err := m.Version()
		if err != nil && err != migrate.ErrNilVersion {
			log.Fatal().Err(err).Msg("Failed to get version")
		}
		log.Info().Uint("version", version).Bool("dirty", dirty).Msg("Current migration version")

	default:
		log.Fatal().Str("action", *action).Msg("Unknown action")
	}
}
