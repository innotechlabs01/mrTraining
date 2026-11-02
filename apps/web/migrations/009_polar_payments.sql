-- Phase C3: migrate membership/payment tracking from Paddle to Polar.
--
-- Column mapping:
--   athlete_memberships.paddle_subscription_id -> polar_subscription_id
--   athlete_memberships.paddle_price_id        -> polar_product_id
--   membership_payments.paddle_transaction_id  -> polar_order_id
--   membership_payments.paddle_invoice_url     -> polar_invoice_url
--
-- These tables/columns are defined in the remote Turso schema (they do not
-- appear in any repo migration). `ALTER TABLE ... RENAME COLUMN` preserves the
-- existing data. If a column is absent on a given database, SQLite errors the
-- statement; in that case replace the affected RENAME with the guarded ADD +
-- UPDATE copy shown below (idempotent, never loses data).

ALTER TABLE athlete_memberships RENAME COLUMN paddle_subscription_id TO polar_subscription_id;
ALTER TABLE athlete_memberships RENAME COLUMN paddle_price_id TO polar_product_id;
ALTER TABLE membership_payments RENAME COLUMN paddle_transaction_id TO polar_order_id;
ALTER TABLE membership_payments RENAME COLUMN paddle_invoice_url TO polar_invoice_url;

-- Prevent duplicate payment rows for the same Polar order id. Combined with the
-- idempotency guard in recordPayment(), a duplicate webhook delivery will not
-- double-insert nor double-extend the membership period.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_polar_order ON membership_payments(polar_order_id);

-- Guarded fallback when a legacy column does not exist (manual apply):
--
--   ALTER TABLE athlete_memberships ADD COLUMN polar_subscription_id TEXT;
--   ALTER TABLE athlete_memberships ADD COLUMN polar_product_id TEXT;
--   UPDATE athlete_memberships SET polar_subscription_id = paddle_subscription_id WHERE paddle_subscription_id IS NOT NULL;
--   UPDATE athlete_memberships SET polar_product_id = paddle_price_id WHERE paddle_price_id IS NOT NULL;
--
--   ALTER TABLE membership_payments ADD COLUMN polar_order_id TEXT;
--   ALTER TABLE membership_payments ADD COLUMN polar_invoice_url TEXT;
--   UPDATE membership_payments SET polar_order_id = paddle_transaction_id WHERE paddle_transaction_id IS NOT NULL;
--   UPDATE membership_payments SET polar_invoice_url = paddle_invoice_url WHERE paddle_invoice_url IS NOT NULL;
--
-- Then DROP the legacy columns once the copy is verified:
--   ALTER TABLE athlete_memberships DROP COLUMN paddle_subscription_id;
--   ALTER TABLE athlete_memberships DROP COLUMN paddle_price_id;
--   ALTER TABLE membership_payments DROP COLUMN paddle_transaction_id;
--   ALTER TABLE membership_payments DROP COLUMN paddle_invoice_url;
