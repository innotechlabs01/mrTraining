-- 303_commission_prereqs.sql
-- The ally network migrations (019_allies / 020_commissions) were consolidated
-- into 300_remaining_migrations.sql, and two pieces were dropped in the
-- process:
--
--   * the table coach_ally_relationships (the relation between a coach and an
--     ally), which commission_agreements, ally_operations and ally_invitations
--     reference with a foreign key
--   * the coach_id column of commission_entries, which the commission RLS
--     migration (302) uses to scope the rows
--
-- Both only existed in the databases that were built with the ORIGINAL
-- migration set, so a database created from scratch was missing them: the
-- chain failed on "relation coach_ally_relationships does not exist" and the
-- commission RLS migration could not add its index.
--
-- This migration restores both, idempotently: on a database that already has
-- them nothing changes.

CREATE TABLE IF NOT EXISTS public.coach_ally_relationships (
    id            TEXT PRIMARY KEY,
    coach_id      TEXT NOT NULL,
    ally_id       TEXT NOT NULL REFERENCES public.allies(id),
    status        TEXT NOT NULL DEFAULT 'invited',
    attributed_by TEXT,
    invited_at    TIMESTAMPTZ,
    activated_at  TIMESTAMPTZ,
    ended_at      TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT coach_ally_relationships_coach_id_ally_id_key UNIQUE (coach_id, ally_id),
    CONSTRAINT coach_ally_relationships_status_check
        CHECK (status IN ('invited', 'active', 'declined', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_car_coach ON public.coach_ally_relationships (coach_id);
CREATE INDEX IF NOT EXISTS idx_car_ally ON public.coach_ally_relationships (ally_id);

-- commission_entries carries the coach that owns the entry: it is the key the
-- commission RLS policies filter on.
ALTER TABLE public.commission_entries
    ADD COLUMN IF NOT EXISTS coach_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_commission_entries_coach_rls
    ON public.commission_entries (coach_id);

-- The settlement line items and documents were lost in the same consolidation:
-- the security migration (414) enables RLS on them, and the settlement
-- services read and write them.
CREATE TABLE IF NOT EXISTS public.settlement_items (
    id            TEXT PRIMARY KEY,
    settlement_id TEXT NOT NULL REFERENCES public.coach_settlements(id),
    entry_id      TEXT NOT NULL REFERENCES public.commission_entries(id),
    base_cents    INTEGER NOT NULL DEFAULT 0,
    rate_bps      INTEGER NOT NULL DEFAULT 0,
    amount_cents  INTEGER NOT NULL DEFAULT 0,
    released_at   TEXT,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT settlement_items_settlement_id_entry_id_key UNIQUE (settlement_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON public.settlement_items (settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_entry ON public.settlement_items (entry_id);

CREATE TABLE IF NOT EXISTS public.settlement_documents (
    id            TEXT PRIMARY KEY,
    settlement_id TEXT NOT NULL REFERENCES public.coach_settlements(id),
    kind          TEXT NOT NULL DEFAULT 'draft_account_of_collection',
    content_ref   TEXT,
    status        TEXT NOT NULL DEFAULT 'draft',
    version       INTEGER NOT NULL DEFAULT 1,
    generated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_settlement_documents_settlement ON public.settlement_documents (settlement_id);
