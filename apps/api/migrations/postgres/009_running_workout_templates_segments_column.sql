-- running_workout_templates — agregar columna segments JSONB para almacenar segmentos como snapshot
-- La tabla ya existe (migración 003), esta migración agrega la columna faltante que el código espera.
ALTER TABLE running_workout_templates ADD COLUMN IF NOT EXISTS segments JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_running_workout_templates_segments ON running_workout_templates USING GIN(segments);
