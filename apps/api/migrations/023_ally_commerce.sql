-- Ally commerce (operaciones, reservas, tickets QR), Phase D.
-- Migración additiva sobre las aplicadas (019, 020, 021, 022).
-- No altera ni elimina tablas existentes.

-- ============================
-- ally_operations: agregado raíz
-- ============================
-- kind: 'order' (compra de producto/servicio) o 'reserva' ( reserva de servicio).
-- relationship_id: FIJADO al crear (R7). Determina el coach/aliado dueño.
-- status: created → confirmed → fulfilled/attended | {created,confirmed} → cancelled.
-- Ningún campo monetario cambia cuando el dueño modifica luego un producto/servicio
-- (los precios son snapshots en la operación).

CREATE TABLE IF NOT EXISTS ally_operations (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,               -- order | reservation
  relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id), -- R7: fijado al crear
  ally_id       TEXT NOT NULL REFERENCES allies(id),
  athlete_id    TEXT NOT NULL,             -- Clerk user id del comprador/atleta
  status        TEXT NOT NULL,             -- created | confirmed | fulfilled | attended | no_show | cancelled
  scheduled_at  TEXT,                      -- solo reservation; fecha/hora tentativa
  confirmed_at  TEXT,                      -- cuándo se confirmó (null hasta transition)
  completed_at  TEXT,                      -- cuándo se cumplió/atendió (null hasta transition)
  cancelled_at  TEXT,                      -- cuándo se canceló (null hasta transition)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind IN ('order','reservation')),
  CHECK (status IN ('created','confirmed','fulfilled','attended','no_show','cancelled')),
  CHECK (kind = 'reservation' AND scheduled_at IS NOT NULL OR kind = 'order' AND scheduled_at IS NULL)
);

-- Índice para búsquedas por atleta y estado.
CREATE INDEX IF NOT EXISTS idx_ally_operations_athlete ON ally_operations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ally_operations_status ON ally_operations(status);
CREATE INDEX IF NOT EXISTS idx_ally_operations_relationship ON ally_operations(relationship_id);

-- ============================
-- ally_operation_items: ítems de catálogo dentro de una operación
-- ============================
-- Cada ítem referencia un producto o servicio del catálogo (ally_products / ally_services)
-- por offer_kind y offer_id. Los precios unitarios son snapshots (no varían si el dueño
-- después modifica el producto/servicio).

CREATE TABLE IF NOT EXISTS ally_operation_items (
  id            TEXT PRIMARY KEY,
  operation_id  TEXT NOT NULL REFERENCES ally_operations(id),
  offer_kind    TEXT NOT NULL,               -- product | service
  offer_id      TEXT NOT NULL,               -- id de ally_products o ally_services
  name          TEXT NOT NULL,               -- nombre del producto/servicio en el momento
  unit_price_cents INTEGER NOT NULL DEFAULT 0, -- snapshot en centavos COP
  quantity      INTEGER NOT NULL DEFAULT 1,
  CHECK (offer_kind IN ('product','service')),
  CHECK (unit_price_cents >= 0),
  CHECK (quantity >= 1)
);

-- Índice para recorrer los ítems de una operación.
CREATE INDEX IF NOT EXISTS idx_ally_operation_items_op ON ally_operation_items(operation_id);

-- ============================
-- ally_redemptions: tickets/QR (single-use, anti-replay)
-- ============================
-- token_hash: SHA-256(token de 32 bytes CSPRNG), nunca el token en claro.
-- expires_at: fecha/hora de expiración.
-- status: issued | redeemed | expired | cancelled.
-- Una operación tiene como mucho un redemption activo (status='issued').
-- La redención es atómica: WHERE status='issued' UPDATE ... SET status='redeemed'.

CREATE TABLE IF NOT EXISTS ally_redemptions (
  id            TEXT PRIMARY KEY,
  operation_id  TEXT NOT NULL REFERENCES ally_operations(id),
  token_hash    TEXT NOT NULL,               -- SHA-256 de token 32B CSPRNG, base64url
  expires_at    TEXT NOT NULL,               -- fecha/hora de expiración
  redeemed_by   TEXT,                        -- Clerk user id quien redimió
  redeemed_at   TEXT,                        -- cuándo se redimió (null hasta redeem)
  status        TEXT NOT NULL DEFAULT 'issued', -- issued | redeemed | expired | cancelled
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(token_hash),
  CHECK (status IN ('issued','redeemed','expired','cancelled')),
  CHECK (expires_at > '1970-01-01') -- bonita sanity check
);

-- Índice para validación de token único y estado.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ally_redemptions_token ON ally_redemptions(token_hash);
CREATE INDEX IF NOT EXISTS idx_ally_redemptions_op ON ally_redemptions(operation_id);
CREATE INDEX IF NOT EXISTS idx_ally_redemptions_status ON ally_redemptions(status);

-- Restricción de negocio: a lo sumo un redemption 'issued' por operación.
-- Se aplica a nivel de aplicación al iniciar la transacción; el patrón
-- "UPDATE ... WHERE status='issued'" garantiza idempotencia y anti-replay.