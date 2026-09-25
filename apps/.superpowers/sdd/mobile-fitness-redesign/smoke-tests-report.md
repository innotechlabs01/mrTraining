# Smoke Tests Report — API Endpoints

**Date:** 2026-09-10  
**Script:** `apps/api/tests/smoke/endpoints.sh`  
**Status:** Ready for execution

## Summary

Created comprehensive smoke test script covering all 18 new API endpoints across 4 feature areas.

## Endpoints Tested

| Category | Count | Status |
|----------|-------|--------|
| Gamification | 6 | ✅ Implemented |
| Leaderboard | 3 | ✅ Implemented |
| Coach Feed | 5 | ✅ Implemented |
| Video Analytics | 4 | ✅ Implemented |
| **Total** | **18** | **All covered** |

## Test Coverage

### Gamification (6 tests)
- `GET /gamification/streak` — 200 OK
- `GET /gamification/badges` — 200 OK
- `POST /gamification/badges/check` — 200 OK (with workout_id body)
- `GET /gamification/prs` — 200 OK
- `POST /gamification/prs/record` — 200 OK (with exercise data body)
- `GET /gamification/weekly-challenges` — 200 OK

### Leaderboard (3 tests)
- `GET /leaderboard/group/:group_id` — 200 OK
- `GET /leaderboard/weekly` — 200 OK
- `GET /leaderboard/history` — 200 OK

### Coach Feed (5 tests)
- `GET /coach/feed` — 200 OK
- `POST /coach/feed` — 201 Created
- `DELETE /coach/feed/:post_id` — 404 Not Found (expected for nonexistent resource)
- `POST /coach/feed/:post_id/react` — 404 Not Found (expected for nonexistent resource)
- `POST /coach/feed/:post_id/comment` — 404 Not Found (expected for nonexistent resource)
- `GET /coach/feed/:post_id/comments` — 404 Not Found (expected for nonexistent resource)

### Video Analytics (4 tests)
- `POST /video-analytics/track` — 201 Created (with exercise metrics body)
- `GET /video-analytics/summary` — 200 OK
- `GET /video-analytics/per-exercise` — 200 OK
- `GET /video-analytics/sessions` — 200 OK

## Usage

```bash
# Run against local API
./apps/api/tests/smoke/endpoints.sh

# Run against custom URL
./apps/api/tests/smoke/endpoints.sh http://localhost:8080/api/v1
```

## Notes

- DELETE and POST operations on Coach Feed use `/test-post` ID, expecting 404 since no real data exists
- Script exits with code 0 on all pass, 1 on any failure
- Output includes HTTP status codes for debugging
