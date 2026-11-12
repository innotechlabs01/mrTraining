# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [db] New role: dev-database (Supabase/PostgreSQL expert with RLS focus) — @orca-team (internal)
- [in] Git workflow + changelog rules (15-git-workflow-changelog.md) — @orca-team (internal)

### Changed
- [in] Added dev-database role to orca-team pipeline and 14-team-workflow.md — @orca-team (internal)

---

## [1.0.0] - 2026-XX-XX

### Added - Running / GPS (S0–S11)
- [fe] Running history + detail pages with map, live tracker — @dev-front (PR #?)
- [fe] Running API client + `RunningRouteMap` SSR-safe — @dev-front (PR #?)
- [fe] GPS running detail + live-location endpoint — @dev-front (PR #?)
- [be] Activity import (GPX/TCX/FIT) + Garmin provider + webhook — @dev-backend (PR #?)
- [be] Training AI insights — `GET /workouts/:id/ai-insights` — @dev-backend (PR #?)
- [be] Real analytics repository + routes `/analytics` — @dev-backend (PR #?)
- [be] Running session lifecycle — PATCH/DELETE, GPS batch, rate limit — @dev-backend (PR #?)
- [mo] GPS run recording with offline-first queue — @dev-react-native (PR #?)
- [mo] Workout detail with AI insights on web and mobile — @dev-react-native (PR #?)

### Added - API / Backend
- [be] Secure data migration tool Turso → PostgreSQL — @dev-backend (PR #?)
- [be] Unit tests + improved resilience for data-migrate — @dev-backend (PR #?)

### Added - Features
- [fe] 7-day membership trial — @dev-front (PR #?)
- [fe] Morning readiness check-in — @dev-front (PR #?)
- [fe] Garmin manual sync + mobile bridge + Settings wearables — @dev-front (PR #?)

### Documentation
- [in] Commercial audit for MR Training SaaS monetization — @dev-backend (PR #?)
- [in] Fitness improvement plan v2 closeout (S0–S11 done) — @dev-backend (PR #?)

### Changed
- [be] gofmt handlers and running service test — @dev-backend (PR #?)

### Other
- [in] Sync pending team changes across api, web, mobile — @dev-backend (PR #?)