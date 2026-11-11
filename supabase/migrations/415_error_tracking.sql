-- 415_error_tracking.sql
-- Error tracking table for super admin to monitor platform errors
-- Errors are saved to DB and pushed to Discord webhook for visibility
-- Status tracks: open -> resolved (or ignored)

CREATE TABLE IF NOT EXISTS platform_errors (
    id               TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    source           TEXT NOT NULL,           -- e.g. 'web', 'api', 'mobile', 'cron'
    severity         TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    status           TEXT NOT NULL DEFAULT 'open',   -- open, resolved, ignored
    discord_message_id TEXT,                      -- Discord message ID for tracking
    discord_channel_id TEXT,                      -- Discord channel where it was posted
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ,
    resolved_by      TEXT,                        -- Clerk user ID who resolved it
    resolved_note    TEXT                         -- Optional note when resolving
);

CREATE INDEX IF NOT EXISTS idx_platform_errors_status ON platform_errors(status);
CREATE INDEX IF NOT EXISTS idx_platform_errors_severity ON platform_errors(severity);
CREATE INDEX IF NOT EXISTS idx_platform_errors_created_at ON platform_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_errors_source ON platform_errors(source);

-- RLS: super admin can see all, others see nothing
ALTER TABLE platform_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_errors_super_admin_all ON platform_errors;
CREATE POLICY platform_errors_super_admin_all ON platform_errors
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) = ANY(
            string_to_array(current_setting('app.platform_super_admin_clerk_ids', true), ',')
        )
    );
