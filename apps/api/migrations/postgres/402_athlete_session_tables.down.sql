-- Down migration for 402_athlete_session_tables.sql
-- Drops the athlete session projection tables and their RLS policies.

DROP POLICY IF EXISTS athlete_prs_tenant_isolation ON athlete_prs;
DROP POLICY IF EXISTS athlete_session_stats_tenant_isolation ON athlete_session_stats;
DROP POLICY IF EXISTS athlete_session_progress_tenant_isolation ON athlete_session_progress;

DROP TABLE IF EXISTS athlete_prs;
DROP TABLE IF EXISTS athlete_session_stats;
DROP TABLE IF EXISTS athlete_session_progress;
