-- exercise_library — agregar columna image_url para la galería de ejercicios.
-- La tabla ya existe (migración 300_remaining_migrations.sql). Esta migración
-- agrega la columna faltante que el dominio/DTO/repositorio esperan.
-- Se aplica manualmente a Turso (no hay runner de migraciones Go).
ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_exercise_library_image_url ON exercise_library(image_url);
