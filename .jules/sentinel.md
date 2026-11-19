# Sentinel's Journal - Critical Security Learnings

## 2026-03-31 - Constant-Time Webhook Secret Verification
**Vulnerability:** In `apps/api/internal/interfaces/http/handlers/garmin_webhook.go`, webhook authentication verified the `X-Garmin-Signature` header via standard Go string equality `!=`. Standard string comparison short-circuits on the first mismatched byte, creating measurable execution time differences (timing side-channel attack) that can leak authentication secrets byte-by-byte.
**Learning:** Webhook endpoints frequently receive static or HMAC secrets in request headers. When verifying non-HMAC bearer/shared secret signatures or pre-computed digests, developers may intuitively write `header != secret` instead of using cryptographic comparison utilities.
**Prevention:** Always compare sensitive credentials, tokens, and webhook signatures using constant-time comparison algorithms such as `crypto/subtle.ConstantTimeCompare` (or `crypto/hmac.Equal`) to eliminate timing side channels.
