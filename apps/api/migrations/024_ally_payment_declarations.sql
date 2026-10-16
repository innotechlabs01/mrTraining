-- Ally payment declarations (H-03, Phase E).
-- ally_payment_declarations: historial versionado e inmutable de declaraciones
-- de pago directo recibido por el aliado. MR Training NO valida el pago contra
-- ningún banco/pasarela; la declaración es solo una declaración del aliado.
-- Append-only: correcciones crean nueva versión (supersedes_id), nunca se
-- modifica ni borra una versión existente.
-- Additive only: referencia `ally_operations` (creada en 023_ally_commerce.sql).

CREATE TABLE IF NOT EXISTS ally_payment_declarations (
  id           TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  version      INTEGER NOT NULL DEFAULT 1,
  supersedes_id TEXT REFERENCES ally_payment_declarations(id),
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'COP',
  method       TEXT,
  declared_at  TEXT NOT NULL,
  reference    TEXT,
  evidence_ref TEXT,                       -- ruta PRIVADA, no URL pública (H-04)
  status       TEXT NOT NULL DEFAULT 'declared', -- declared|under_review|confirmed|rejected|reversed
  reviewed_by  TEXT,
  reviewed_at  TEXT,
  review_note  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (operation_id, version),
  CHECK (amount_cents >= 0),
  CHECK (currency IN ('COP')),
  CHECK (status IN ('declared','under_review','confirmed','rejected','reversed'))
);

-- A lo sumo UNA declaración ACTIVA por operación.
-- Estados activos: declared, under_review, confirmed.
-- Rechazadas y reversadas no bloquean reintento (nueva versión).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_decl_active
  ON ally_payment_declarations(operation_id)
  WHERE status IN ('declared','under_review','confirmed');

CREATE INDEX IF NOT EXISTS idx_ally_payment_declarations_operation
  ON ally_payment_declarations(operation_id);
CREATE INDEX IF NOT EXISTS idx_ally_payment_declarations_status
  ON ally_payment_declarations(status);
CREATE INDEX IF NOT EXISTS idx_ally_payment_declarations_supersedes
  ON ally_payment_declarations(supersedes_id);
