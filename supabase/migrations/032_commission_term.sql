-- Commission term initial configuration migration, Phase G.
-- Ensures the commission_agreements table has the required columns for commission configuration.
-- Commission rates are configured via: rate_bps (basis points, 800 = 8%) and fixed_amount_cents (in cents, 300000 = 3000 COP).
--
-- To set the initial commission rates, use the admin API:
--   POST /api/v1/admin/commission_terms
--   with body: { "rate_bps": 800, "fixed_amount_cents": 300000 }
--
-- This migration is idempotent: it only adds missing columns.

-- Add missing columns to commission_agreements for compatibility
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS id TEXT PRIMARY KEY;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS relationship_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS rate_bps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS fixed_amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS eligible_base_rule TEXT NOT NULL DEFAULT 'gross_minus_discount_minus_tax';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS rounding TEXT NOT NULL DEFAULT 'half_up';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS valid_from TEXT NOT NULL;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS valid_to TEXT;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'proposed';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS accepted_by TEXT;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS accepted_at TEXT;
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS coach_id TEXT NOT NULL DEFAULT 'coach_default';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS ally_id TEXT NOT NULL DEFAULT 'default_ally';
ALTER TABLE commission_agreements ADD COLUMN IF NOT EXISTS created_at TEXT NOT NULL DEFAULT (NOW());

-- Add missing columns to commission_entries for compatibility
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS operation_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS agreement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commission_entries ADD COLUMN IF NOT EXISTS relationship_id TEXT NOT NULL DEFAULT '';

-- Notes:
-- - rate_bps: 800 = 8.00% commission rate
-- - fixed_amount_cents: 300000 = 3000 COP fixed fee per athlete use
-- - These values can be configured from the super admin panel at /admin/settings
