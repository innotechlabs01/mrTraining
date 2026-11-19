-- 401_subscription_payments.sql
-- Subscription payments: records of payments collected through MercadoPago
-- for a subscription. Idempotent per provider_payment_id (unique index) so
-- replayed webhooks are no-ops.
CREATE TABLE IF NOT EXISTS subscription_payments (
    id                 TEXT PRIMARY KEY,
    subscription_id    TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    provider_payment_id TEXT NOT NULL,
    external_reference TEXT NOT NULL,
    amount             REAL NOT NULL,
    currency           TEXT NOT NULL DEFAULT 'COP',
    status             TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'charged_back')),
    period_start       TIMESTAMPTZ NOT NULL,
    period_end         TIMESTAMPTZ NOT NULL,
    paid_at            TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_payments_provider_payment_id ON subscription_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_external_reference ON subscription_payments(external_reference);
