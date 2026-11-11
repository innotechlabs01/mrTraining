# Sentinel's Journal - Critical Security Learnings

## 2026-11-11 - Webhook Replay Mitigation via Timestamp Tolerance Window
**Vulnerability:** In `apps/api/internal/interfaces/http/handlers/clerk_webhook.go`, Svix/Clerk webhook signatures were verified against `svix-timestamp` and body HMAC, but the handler never enforced timestamp freshness against the server clock. A captured valid webhook request could be replayed indefinitely to trigger duplicate provisioning actions or user updates.
**Learning:** Verifying that a signature matches a signed payload (including timestamp string) only guarantees authenticity and payload integrity; it does not protect against replay attacks unless the receiver actively enforces a tight clock tolerance window (e.g. ±5 minutes) relative to current time.
**Prevention:** Always parse and compare incoming webhook timestamps against `time.Now()` with a strict tolerance threshold (rejecting stale and far-future requests) in addition to verifying cryptographic signatures.

## 2026-03-31 - Constant-Time Webhook Secret Verification
**Vulnerability:** In `apps/api/internal/interfaces/http/handlers/garmin_webhook.go`, webhook authentication verified the `X-Garmin-Signature` header via standard Go string equality `!=`. Standard string comparison short-circuits on the first mismatched byte, creating measurable execution time differences (timing side-channel attack) that can leak authentication secrets byte-by-byte.
**Learning:** Webhook endpoints frequently receive static or HMAC secrets in request headers. When verifying non-HMAC bearer/shared secret signatures or pre-computed digests, developers may intuitively write `header != secret` instead of using cryptographic comparison utilities.
**Prevention:** Always compare sensitive credentials, tokens, and webhook signatures using constant-time comparison algorithms such as `crypto/subtle.ConstantTimeCompare` (or `crypto/hmac.Equal`) to eliminate timing side channels.
