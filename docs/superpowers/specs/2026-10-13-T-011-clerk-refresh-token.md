# Spec: T-011 — Clerk Refresh Token Not Working Correctly

## 1. Problem Statement

Users report "el refresh token con clerk no está funcionando correctamente" — the Clerk session JWT expires (~60s) and the refresh flow fails to obtain a new token, causing 401 errors on API calls and/or forced sign-out loops.

**Scope:** Primary target is `apps/mobile` (Expo + `@clerk/clerk-expo` v2.19.0). Quick check on `apps/web` (Next.js + `@clerk/nextjs` v6) shows similar patterns but no user reports yet.

---

## 2. Root Cause Analysis (with file:line evidence)

### 2.1 Missing JWT Template Parameter (Primary Suspect)

**Files:**
- `apps/mobile/src/infrastructure/auth/clerk.ts:14-17` — `getClerkToken()` calls `session.getToken()` **without a `template` argument**
- `apps/mobile/src/infrastructure/auth/clerk.ts:23-25` — `refreshClerkToken()` calls `getClerkToken({ skipCache: true })` — still no template
- `apps/web/src/lib/api/go-client.ts:39-42` — Same pattern: `getTokenFn(skipCache ? { skipCache: true } : undefined)` — no template

**Why this breaks:** Clerk JWT templates allow the backend to validate audience-specific claims. The Go API (`apps/api/internal/middleware/auth.go:113-120`) verifies tokens via `clerk/jwt.Verify()` which validates the token against the Clerk JWKS for the instance's publishable key. If the Go API was configured to expect a specific template (e.g., `go-api` or `mobile`), tokens issued without that template will fail verification even though they're cryptographically valid.

**Evidence:** Clerk docs state `session.getToken({ template: 'name' })` is required when the backend expects a custom template. The default template may not include claims the Go API middleware expects (e.g., specific `azp`, `org_id`, or custom claims).

---

### 2.2 Mobile Retry Logic Doesn't Verify Token Actually Changed

**File:** `apps/mobile/src/infrastructure/api/client.ts:127-137`

```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  const token = await refreshClerkToken(); // skipCache: true
  if (token && originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return client(originalRequest); // Retries even if token is IDENTICAL to failed one
  }
}
```

**Contrast with Web** (`apps/web/src/lib/api/go-client.ts:79-90`):
```typescript
const freshToken = await getAuthToken(true);
if (freshToken && freshToken !== token) { // <-- Critical guard!
  const retryResponse = await doFetch(freshToken);
  ...
}
```

**Failure mode:** If `skipCache: true` returns the same expired token (e.g., session refresh hasn't completed, or the session itself is expired and Clerk returns null/old token), mobile retries with the same bad token → 401 again → `_retry` is true → request fails permanently. Web avoids this by checking `freshToken !== token`.

---

### 2.3 No Handling for "Session Expired" (Refresh Token Dead)

**Files:**
- `apps/mobile/src/infrastructure/auth/clerk.ts:11-21` — `getClerkToken()` catches all errors and returns `null`
- `apps/mobile/src/infrastructure/api/client.ts:139-140` — On token refresh failure, interceptor just rejects; no redirect to sign-in

**Failure mode:** When the long-lived session (refresh token) expires (default 30 days inactive, or revoked), `session.getToken({ skipCache: true })` returns `null` or throws. The interceptor receives `null`, skips the retry, and rejects with the original 401. The app has no global handler to detect "unrecoverable auth" and redirect to sign-in. User sees a broken screen, not a login prompt.

---

### 2.4 AppStateRefresh Fire-and-Forget Swallows Errors

**File:** `apps/mobile/src/navigation/App.tsx:99-113`

```typescript
useEffect(() => {
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'active' && clerk.session) {
      clerk.session.getToken({ skipCache: true }).catch(() => {}); // <-- Errors silently ignored
    }
  });
  ...
}, [clerk]);
```

**Impact:** Pre-emptive refresh on app foreground is good, but `.catch(() => {})` discards any signal that the session is dead. No logging, no state update, no redirect.

---

### 2.5 Potential Clock Skew (Secondary)

Not directly visible in code, but JWT verification in Go API (`auth.go:113-120`) uses system clock. If device clock drifts >60s from server, tokens appear expired immediately. Clerk SDK handles some skew internally, but the Go middleware does not apply leeway.

---

## 3. Fix Design (Single Proposal)

### 3.1 Add JWT Template to All Token Requests

**Change:** Pass `template: 'mobile'` (or whatever the Go API expects) to every `getToken()` call.

**Locations:**
- `apps/mobile/src/infrastructure/auth/clerk.ts` — both `getClerkToken()` and `refreshClerkToken()`
- `apps/web/src/lib/api/go-client.ts` — `getAuthToken()` (for consistency, even if web not reported)

**Tradeoff:** Requires coordinating with Go API team to confirm the expected template name. If no custom template is configured in Clerk Dashboard, the default works — but the symptom suggests a mismatch. This is the highest-ROI fix: one-line change per call site, fixes the validation failure at the source.

**Alternative considered:** Change Go API to accept default template. Rejected — templates are a security boundary; backend should define what it accepts.

---

### 3.2 Harden Mobile 401 Retry with Token-Change Guard

**Change:** In `client.ts` interceptor, mirror web's `freshToken !== token` check before retry.

```typescript
const freshToken = await refreshClerkToken();
if (freshToken && freshToken !== originalRequest.headers?.Authorization?.replace('Bearer ', '')) {
  originalRequest.headers.Authorization = `Bearer ${freshToken}`;
  return client(originalRequest);
}
```

**Tradeoff:** Adds 2 lines, prevents wasteful retries and infinite-loop risk. No downside.

---

### 3.3 Add Global "Unrecoverable Auth" Handler

**Change:** When `refreshClerkToken()` returns `null` (session dead), emit a global event or call a registered callback to trigger sign-out + redirect to login screen.

**Implementation:** Add `onSessionExpired?: () => void` to `clerk.ts`, set it from `App.tsx` (which has navigation access), call it when `getClerkToken` returns `null` with `skipCache: true`.

**Tradeoff:** Slight coupling (auth infra → navigation), but cleanest UX. Alternative: let each screen handle 401 — leads to inconsistent behavior.

---

### 3.4 Fix AppStateRefresh Error Swallowing

**Change:** Log the error; if it's a "session expired" class error, trigger the same `onSessionExpired` callback.

```typescript
clerk.session.getToken({ skipCache: true })
  .catch((err) => {
    console.warn('[AppStateRefresh] token refresh failed', err);
    if (isSessionExpiredError(err)) onSessionExpired?.();
  });
```

---

### 3.5 (Optional) Add Clock Skew Leeway in Go API Middleware

**File:** `apps/api/internal/middleware/auth.go:113-120`

Add `Leeway` option to `jwt.VerifyParams` (if supported by `clerk-sdk-go/v2/jwt`). If not, document as known limitation.

---

## 4. Decomposition & Roles

| Subtask | Role | Files Touched |
|---------|------|---------------|
| 1. Confirm Go API expected JWT template (check Clerk Dashboard / Go auth config) | Architect (you) + Dev-Go | — |
| 2. Add `template` param to mobile `getClerkToken` / `refreshClerkToken` | Dev-React-Native | `apps/mobile/src/infrastructure/auth/clerk.ts` |
| 3. Add `template` param to web `getAuthToken` (parity) | Dev-Front | `apps/web/src/lib/api/go-client.ts` |
| 4. Add token-change guard to mobile 401 interceptor | Dev-React-Native | `apps/mobile/src/infrastructure/api/client.ts` |
| 5. Implement `onSessionExpired` callback + wiring in App.tsx | Dev-React-Native | `apps/mobile/src/infrastructure/auth/clerk.ts`, `apps/mobile/src/navigation/App.tsx` |
| 6. Fix AppStateRefresh error handling | Dev-React-Native | `apps/mobile/src/navigation/App.tsx` |
| 7. (Optional) Add leeway to Go JWT verification | Dev-Go | `apps/api/internal/middleware/auth.go` |
| 8. E2E test: session survives >1h, 401→refresh→retry works, dead session → login screen | QA Mobile | — |

---

## 5. Acceptance Criteria

1. **Session stays fresh across >1 hour** of app use (background/foreground cycles) without manual sign-in.
2. **401 → refresh → retry succeeds once**: A request that hits 401 due to expired JWT automatically retries with a fresh token and succeeds (verified via network inspector).
3. **No sign-out loop**: Repeated 401s on the same request do not occur; max one retry.
4. **Dead session → login screen**: When the long-lived session is expired/revoked, the app redirects to sign-in within 3s (not a broken UI state).
5. **Web parity**: Same token template used on web; no regression in web auth flow.

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Wrong template name breaks all auth | Medium | High | Confirm template name in Clerk Dashboard **before** coding; test in staging first. |
| `skipCache: true` still returns same token (Clerk SDK bug) | Low | Medium | Token-change guard (3.2) prevents retry loop; `onSessionExpired` catches null return. |
| SecureStore failure on Android (tokenCache) | Low | High | Already in production; not a new risk. Clerk SDK falls back to in-memory. |
| Go API clock skew rejects valid tokens | Low | Medium | Add leeway (3.5) if SDK supports; otherwise monitor. |
| Coordinated deploy needed (mobile + web + API template) | Medium | Medium | Deploy API template config first (Clerk Dashboard), then clients. Use feature flag if needed. |

---

## 7. Information Needed to Proceed (Blocking)

1. **What JWT template name does the Go API expect?** Check Clerk Dashboard → JWT Templates, or ask the Go API owner. If "none" (default), note that and we'll investigate other causes.
2. **Is the issue reproducible in Expo Go / dev client / standalone build?** (Affects SecureStore behavior.)
3. **Any recent Clerk SDK upgrade?** Version 2.19.0 is current — check changelog for token refresh fixes.

---

## 8. Spec Status

- [ ] Template name confirmed
- [ ] Spec approved by coordinator
- [ ] Subtasks created in board
- [ ] Implementation complete
- [ ] E2E validated on device