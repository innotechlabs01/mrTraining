-- Migration 434: Platform commissions settings, Wompi payment split ledger fields, and coach payout account metadata.

-- 1. Seed default platform commission & fee settings (editable from Super Admin /admin/settings)
INSERT INTO platform_settings (key, value, updated_at)
VALUES
  ('coachPlanCommissionPct', '8'::jsonb, NOW()),
  ('mobileAppFeeCop', '3000'::jsonb, NOW()),
  ('allyDefaultCommissionPct', '10'::jsonb, NOW()),
  ('wompiThirdPartyPayoutsEnabled', 'true'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

-- 2. Seed global active commission term if none exists
INSERT INTO platform_commission_terms (
  id,
  coach_id,
  version,
  rate_bps,
  fixed_fee_cents,
  processing_bps,
  currency,
  status,
  valid_from,
  created_at
)
SELECT
  'term-global-default',
  NULL,
  1,
  800,
  300000,
  0,
  'COP',
  'active',
  NOW()::text,
  NOW()::text
WHERE NOT EXISTS (
  SELECT 1
  FROM platform_commission_terms
  WHERE (coach_id IS NULL OR coach_id = '')
    AND status = 'active'
);

-- 3. Extend wompi_payment_ledger with explicit mobile app fee and third-party payout tracking
ALTER TABLE wompi_payment_ledger
  ADD COLUMN IF NOT EXISTS mobile_app_fee_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS third_party_payout_status TEXT NOT NULL DEFAULT 'pending';

-- 4. Extend coaches with Wompi third-party payout destination metadata
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS wompi_payout_account TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wompi_payout_bank TEXT NOT NULL DEFAULT '';

-- 5. Grant DML permissions to application role when present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mr_training_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON platform_commission_terms TO mr_training_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON wompi_payment_ledger TO mr_training_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON platform_settings TO mr_training_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON athlete_memberships TO mr_training_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON coaches TO mr_training_app;
  END IF;
END $$;
