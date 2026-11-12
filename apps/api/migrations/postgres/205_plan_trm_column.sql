-- plan — agregar columna trm (tasa de cambio monetario) para soportar PlanResponse.DTO
-- La tabla plans ya existe (migración original), esta agrega la columna faltante.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trm REAL NOT NULL DEFAULT 0;
