# Sentinel's Journal - Critical Security Learnings

## 2026-03-31 - Constant-Time Webhook Secret Verification
**Vulnerability:** In `apps/api/internal/interfaces/http/handlers/garmin_webhook.go`, webhook authentication verified the `X-Garmin-Signature` header via standard Go string equality `!=`. Standard string comparison short-circuits on the first mismatched byte, creating measurable execution time differences (timing side-channel attack) that can leak authentication secrets byte-by-byte.
**Learning:** Webhook endpoints frequently receive static or HMAC secrets in request headers. When verifying non-HMAC bearer/shared secret signatures or pre-computed digests, developers may intuitively write `header != secret` instead of using cryptographic comparison utilities.
**Prevention:** Always compare sensitive credentials, tokens, and webhook signatures using constant-time comparison algorithms such as `crypto/subtle.ConstantTimeCompare` (or `crypto/hmac.Equal`) to eliminate timing side channels.

## 2026-03-31 - Webhook Timestamp Tolerance and Replay Prevention
**Vulnerability:** In `apps/api/internal/interfaces/http/handlers/clerk_webhook.go`, Clerk Svix webhook signature verification checked HMAC integrity but completely omitted timestamp tolerance validation despite having doc comments and a helper function (`parseSvixTimestamp`) prepared for it. Without timestamp validation, an attacker capturing a valid webhook payload and headers could replay it indefinitely to trigger user/coach lifecycle events.
**Learning:** Having helper functions or comments promising replay protection does not guarantee the logic is wired into the verification pipeline. Timestamp drift windows must be explicitly enforced against `time.Now()` before validating payload cryptographic signatures.
**Prevention:** Always validate webhook timestamp headers against a tight time window (typically ±5 minutes) before or alongside HMAC verification, and test both stale past timestamps and excessive future timestamps.
