-- Commission term (initial configuration), Phase G.
-- Sets the default commission rate of 8% (800 bps) and 3000 COP fixed fee per athlete use.
-- This term is set as active and will be used by the payment ledger when processing
-- membership/subscription payments unless a more specific term is configured.
--
-- rate_bps: 800 = 8.00% commission
-- fixed_amount_cents: 300000 = 3000 COP fixed fee
-- valid_from: current date (NOW())
-- status: 'accepted' to make it active immediately

INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, valid_to, status, accepted_by, accepted_at, created_at)
VALUES (
  'default_coach_commission',
  '', -- no relationship required (global term)
  1,
  800,                          -- 8% in basis points
  300000,                       -- 3000 COP in cents
  'gross_minus_discount_minus_tax',
  'half_up',
  'COP',
  NOW(),
  NULL,
  'accepted',
  NULL,
  NULL,
  NOW()
);

-- Also create a default commission entry for the first subscription payment
-- using the newly created term. This is idempotent as it only runs once.
INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at)
SELECT
  'default_entry_' || g.id,
  ''::text,
  '',
  g.coach_id,
  g.id,
  1,
  0,
  g.rate_bps,
  g.fixed_amount_cents,
  0,
  'COP',
  'accrued',
  NOW()
FROM commission_agreements g
WHERE g.id = 'default_coach_commission'
ON CONFLICT (operation_id) DO NOTHING;
