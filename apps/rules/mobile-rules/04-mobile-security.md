# MR Training — Mobile Security

**Version 1.0 — 2026**

---

## 1. Security First

Act as an Ethical Hacker specializing in Mobile Security. Every code review includes a security audit.

**Golden rule: Never trust the frontend.** All critical validation must exist on the backend (Next.js API routes).

---

## 2. OWASP Mobile Top 10 Checklist

| # | Vulnerability | Mitigation |
|---|--------------|------------|
| M1 | Improper Credential Usage | Clerk handles auth. Never store passwords. Use secure token storage. |
| M2 | Inadequate Supply Chain Security | Lock dependencies. Use `npm audit`. Review third-party code. |
| M3 | Insecure Authentication/Authorization | All API calls include Clerk JWT. Backend validates every request. |
| M4 | Insufficient Input Validation | Zod schemas on every form. Server-side re-validation. |
| M5 | Insecure Communication | HTTPS only. Certificate pinning for production. |
| M6 | Inadequate Privacy Controls | Minimal data collection. User consent for sensitive data. |
| M7 | Insufficient Binary Protections | ProGuard/R8 (Android). Hermes bytecode (iOS). |
| M8 | Security Misconfiguration | No debug mode in production. Secure default settings. |
| M9 | Insecure Data Storage | MMKV with encryption. Never store sensitive data in AsyncStorage. |
| M10 | Insufficient Transport Layer Protection | TLS 1.3 minimum. HSTS. Certificate transparency. |

---

## 3. API Security

### OWASP API Top 10

1. **Broken Object Level Authorization** — Backend validates ownership on every request (`coach_id = auth.userId`)
2. **Broken Authentication** — Clerk JWT validation on ALL `/api/coaching/*` routes
3. **Broken Object Property Level Authorization** — Backend whitelists updatable fields
4. **Unrestricted Resource Consumption** — Rate limiting (Next.js middleware)
5. **Broken Function Level Authorization** — Role-based access (coach vs athlete)
6. **Unrestricted Access to Sensitive Business Flows** — Rate limit sign-in attempts
7. **Server Side Request Forgery** — Validate and sanitize all user-supplied URLs
8. **Security Misconfiguration** — No stack traces in API responses
9. **Improper Inventory Management** — API versioning (`/api/v1/`)
10. **Unsafe Consumption of APIs** — Validate third-party API responses

---

## 4. Secure Storage

```typescript
// ✅ Good: MMKV with encryption
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV({
  id: 'mrtraining-secure',
  encryptionKey: 'generated-encryption-key', // From secure enclave
});

// ❌ Bad: AsyncStorage for sensitive data
// AsyncStorage.setItem('token', jwt); // NEVER do this
```

**Rules:**
- Tokens stored by Clerk SDK (handles secure storage internally)
- Offline cache in MMKV (encrypted)
- No sensitive data in `AsyncStorage`, `SharedPreferences`, or `NSUserDefaults`

---

## 5. Hardcoded Secrets

**Forbidden in code:**
- API keys
- JWT secrets
- OAuth client secrets
- Encryption keys
- Database credentials
- Third-party service tokens
- Clerk secret keys

All secrets live in environment variables or a secure vault. Never committed to git.

---

## 6. Anti-Tampering

### Android
- ProGuard/R8 obfuscation
- Root detection (warning, not blocking)
- SafetyNet / Play Integrity API check

### iOS
- Hermes bytecode (no readable JS bundles)
- Jailbreak detection (warning, not blocking)

---

## 7. Secure Coding Patterns

```typescript
// ✅ Good: Validate input at the edge
const exerciseSchema = z.object({
  name: z.string().min(1).max(100),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(1000).optional(),
});

// ✅ Good: Sanitize output
export function formatWorkoutName(name: string): string {
  return name.replace(/[<>]/g, '').trim();
}

// ❌ Bad: Unsanitized user input in API calls
// fetch(`/api/workouts/${userInput}`) // Path traversal risk

// ✅ Good: Encode user input
// fetch(`/api/workouts/${encodeURIComponent(workoutId)}`)
```

---

## 8. HTTPS / Network Security

- **App Transport Security (iOS):** No `NSAllowsArbitraryLoads` in production
- **Network Security Config (Android):** `cleartextTrafficPermitted="false"` in production
- **Certificate pinning:** Optional for high-security mode (future)

---

## 9. Audit Checklist

Before every release, verify:

- [ ] No hardcoded secrets in code
- [ ] All API calls use HTTPS
- [ ] Clerk JWT on every authenticated request
- [ ] Backend validates ownership (coach_id matches)
- [ ] No sensitive data in logs
- [ ] MMKV configured with encryption
- [ ] No debug code in production build
- [ ] Rate limiting active on backend
- [ ] Dependency audit (`npm audit`) clean
- [ ] ProGuard/R8 enabled (Android release)
