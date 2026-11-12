-- 422_pending_checkouts.sql
-- Hybrid checkout: the coach pays BEFORE creating the account.
--
-- When a plan is picked, a pending checkout is created and a Wompi payment link
-- is issued with sku = "checkout:<id>". The webhook records the payment here
-- (it cannot go into subscription_payments: that table has a foreign key to
-- subscriptions, and the subscription only exists once the user registers).
--
-- The claim then creates the subscription, provisions the coach and attaches
-- the payment. A checkout is keyed by email so a payer who never registers can
-- recover their checkout when they come back.

CREATE TABLE IF NOT EXISTS public.pending_checkouts (
    id                  TEXT PRIMARY KEY,
    email               TEXT NOT NULL,
    plan_id             TEXT NOT NULL,
    plan_name           TEXT NOT NULL DEFAULT '',
    amount              REAL NOT NULL DEFAULT 0,
    currency            TEXT NOT NULL DEFAULT 'USD',
    provider_reference  TEXT NOT NULL DEFAULT '',
    provider_payment_id TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'created',
    user_id             TEXT NOT NULL DEFAULT '',
    coach_code          TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_email ON public.pending_checkouts (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_status ON public.pending_checkouts (status);

ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_checkouts_select ON public.pending_checkouts;
CREATE POLICY pending_checkouts_select ON public.pending_checkouts
  FOR SELECT USING (
    id = NULLIF(current_setting('app.checkout_id', true)::text, '')
    OR current_user = 'mr_training_app'
  );

DROP POLICY IF EXISTS pending_checkouts_write ON public.pending_checkouts;
CREATE POLICY pending_checkouts_write ON public.pending_checkouts
  FOR INSERT WITH CHECK (current_user = 'mr_training_app');

DROP POLICY IF EXISTS pending_checkouts_update ON public.pending_checkouts;
CREATE POLICY pending_checkouts_update ON public.pending_checkouts
  FOR UPDATE USING (current_user = 'mr_training_app')
  WITH CHECK (current_user = 'mr_training_app');

GRANT SELECT, INSERT, UPDATE ON TABLE public.pending_checkouts TO mr_training_app;
