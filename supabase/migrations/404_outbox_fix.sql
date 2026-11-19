-- Fix outbox schema to match code expectations and design requirements
-- Add event_id, leases, unify states, adjust defaults

-- Add event_id column if missing
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS event_id UUID;

-- Make event_id unique if possible (backfill first)
UPDATE outbox SET event_id = gen_random_uuid() WHERE event_id IS NULL;
ALTER TABLE outbox ALTER COLUMN event_id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE outbox ADD CONSTRAINT outbox_event_id_key UNIQUE (event_id);
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- Add lease columns
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS locked_by VARCHAR(255);
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Ensure next_retry_at has default
ALTER TABLE outbox ALTER COLUMN next_retry_at SET DEFAULT NOW();

-- Backfill next_retry_at for existing rows
UPDATE outbox SET next_retry_at = COALESCE(next_retry_at, occurred_at, NOW()) WHERE next_retry_at IS NULL;
ALTER TABLE outbox ALTER COLUMN next_retry_at SET NOT NULL;

-- Update status comment constraint expectations - ensure status values are compatible
-- Allow pending, processing, published, dead (also accept failed for backward compat)
COMMENT ON COLUMN outbox.status IS 'Estado del evento: pending, processing, published, dead (failed deprecated)';
COMMENT ON COLUMN outbox.event_id IS 'Identificador canónico único por evento';
COMMENT ON COLUMN outbox.locked_by IS 'Worker propietario del lease';
COMMENT ON COLUMN outbox.locked_until IS 'Expiración del lease';

-- Indexes for worker
CREATE INDEX IF NOT EXISTS idx_outbox_claim ON outbox (status, next_retry_at, locked_until) WHERE status IN ('pending');
CREATE INDEX IF NOT EXISTS idx_outbox_processing_expired ON outbox (status, locked_until) WHERE status = 'processing';
