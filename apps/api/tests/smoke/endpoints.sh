#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080/api/v1}"
PASS=0
FAIL=0

test_endpoint() {
  local method=$1
  local path=$2
  local body=$3
  local expected=$4
  local desc=$5
  
  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$body" "$BASE_URL$path")
  fi
  
  if [ "$status" = "$expected" ]; then
    echo "✅ PASS [$status] $desc"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL [$status != $expected] $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "Testing endpoints against: $BASE_URL"
echo "=================================="

# Gamification (6 endpoints)
test_endpoint GET "/gamification/streak" "" "200" "GET /gamification/streak"
test_endpoint GET "/gamification/badges" "" "200" "GET /gamification/badges"
test_endpoint POST "/gamification/badges/check" '{"workout_id":"test"}' "200" "POST /gamification/badges/check"
test_endpoint GET "/gamification/prs" "" "200" "GET /gamification/prs"
test_endpoint POST "/gamification/prs/record" '{"exercise_id":"e1","exercise_name":"Squat","value":100,"unit":"kg"}' "200" "POST /gamification/prs/record"
test_endpoint GET "/gamification/weekly-challenges" "" "200" "GET /gamification/weekly-challenges"

# Leaderboard (3 endpoints)
test_endpoint GET "/leaderboard/group/test-group" "" "200" "GET /leaderboard/group/:group_id"
test_endpoint GET "/leaderboard/weekly" "" "200" "GET /leaderboard/weekly"
test_endpoint GET "/leaderboard/history" "" "200" "GET /leaderboard/history"

# Coach Feed (5 endpoints)
test_endpoint GET "/coach/feed" "" "200" "GET /coach/feed"
test_endpoint POST "/coach/feed" '{"content":"Test post"}' "201" "POST /coach/feed"
test_endpoint DELETE "/coach/feed/test-post" "" "404" "DELETE /coach/feed/:post_id (not found)"
test_endpoint POST "/coach/feed/test-post/react" '{"type":"like"}' "404" "POST /coach/feed/:post_id/react (not found)"
test_endpoint POST "/coach/feed/test-post/comment" '{"content":"Great!"}' "404" "POST /coach/feed/:post_id/comment (not found)"
test_endpoint GET "/coach/feed/test-post/comments" "" "404" "GET /coach/feed/:post_id/comments (not found)"

# Video Analytics (4 endpoints)
test_endpoint POST "/video-analytics/track" '{"exercise_id":"e1","exercise_name":"Squat","duration_sec":60,"rep_count":10,"avg_form_score":85,"min_form_score":70,"max_form_score":95}' "201" "POST /video-analytics/track"
test_endpoint GET "/video-analytics/summary" "" "200" "GET /video-analytics/summary"
test_endpoint GET "/video-analytics/per-exercise" "" "200" "GET /video-analytics/per-exercise"
test_endpoint GET "/video-analytics/sessions" "" "200" "GET /video-analytics/sessions"

echo ""
echo "=================================="
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
