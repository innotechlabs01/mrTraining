# MR Training — Security Architecture

**Version 1.0 — 2026**

---

## Table of Contents

1. [Security Philosophy](#1-security-philosophy)
2. [Authentication & Identity](#2-authentication--identity)
3. [Authorization & Access Control](#3-authorization--access-control)
4. [Data Protection](#4-data-protection)
5. [Network Security](#5-network-security)
6. [Application Security](#6-application-security)
7. [Infrastructure Security](#7-infrastructure-security)
8. [Compliance & Privacy](#8-compliance--privacy)
9. [Incident Response](#9-incident-response)
10. [Security Operations](#10-security-operations)

---

## 1. Security Philosophy

### 1.1 Core Principles

**Everything authenticated. Everything authorized. Everything validated. Everything logged. Everything encrypted.**

This is not a slogan. It is the implementation standard against which every code review is measured. An endpoint without authentication is a bug. A database query without an organization filter is a data breach. A user input without validation is an injection vector. A critical action without an audit log is invisible to incident response.

**Defense in depth.** No single security control should be the sole barrier between an attacker and protected data. Authentication at the edge (Clerk/Cloudflare), authorization at the API (middleware + RBAC), tenant isolation at the database (Row-Level Security), encryption at rest and in transit — every layer assumes the layer above it may be compromised.

**Least privilege.** Every service account, every API key, every database user, every employee has the minimum permissions required to perform their function. A service that only reads athlete data should never have write access. A CI/CD pipeline that deploys to staging should never have production credentials. Privilege is granted temporarily and revoked automatically.

**Secure by default.** The default configuration of every system component — fresh install, unconfigured, out of the box — must be secure. A developer who forgets to configure a firewall inherits a deny-all policy, not an allow-all. A new API endpoint that forgets to add authorization middleware returns 401, not 200. Security must be opt-out, not opt-in — because opt-in always gets forgotten.

**Assume compromise.** Design systems with the assumption that any component could be breached. Isolate blast radius. Limit lateral movement. Encrypt sensitive data such that a compromised database server does not expose plaintext athlete data. Rotate credentials such that a leaked API key has a limited window of exploitability. Log everything such that a breach is detectable within minutes, not months.

### 1.2 Threat Model

MR Training's primary threat actors:

| Actor | Motivation | Capability | Primary Targets |
|-------|-----------|------------|----------------|
| Competitors | Business intelligence | Medium | Athlete lists, pricing data, program templates |
| Unauthorized users | Free access to premium features | Low | API endpoints, feature flag bypass |
| Malicious insiders (coaches) | Access rival coaches' athlete data | Medium | Cross-organization data access |
| Automated scanners | Opportunistic exploitation | Low | Known CVEs, misconfigured endpoints |
| Targeted attackers | Athlete PII, payment data | High | Database, authentication system |
| State actors | Intelligence gathering on athletes | High | High-profile athlete data, internal communications |

Primary assets requiring protection:
1. Athlete PII (names, emails, health data, body metrics, performance data)
2. Payment information (processed by Polar — card data never touches MR Training servers)
3. Authentication credentials (managed by Clerk)
4. Coach intellectual property (program designs, training methodologies)
5. Business data (revenue, pricing, customer lists)

### 1.3 Security Standards

MR Training targets compliance with:
- **SOC 2 Type II** — Security, availability, and confidentiality trust service criteria
- **GDPR** — European data protection (athlete data portability, right to deletion, data processing records)
- **HIPAA** (where applicable for physical therapist integrations) — Protected health information safeguards
- **OWASP Top 10** — Web application security baseline
- **PCI DSS** — Indirect compliance (card data handled exclusively by Polar/Stripe, reducing PCI scope to SAQ-A)

---

## 2. Authentication & Identity

### 2.1 Clerk Integration

Authentication is delegated to Clerk, a SOC 2 Type II certified identity provider. MR Training never stores passwords, implements password reset, or manages multi-factor authentication directly.

**Clerk features used:**
- Session management with httpOnly, Secure, SameSite=Lax cookies
- Social SSO (Google, Apple, Facebook) with optional MFA enforcement
- Organization-aware authentication — user identity is scoped to their organization context
- Webhook integration for user lifecycle events (user.created, user.updated, user.deleted)
- Custom JWT claims for role and permission embedding

**JWT Token Security:**
- Signed with RS256 (asymmetric) — Clerk holds the private key; MR Training validates with public JWKS
- Short-lived access tokens (1 hour) with automatic silent refresh
- Refresh token rotation — each refresh invalidates the previous token
- Refresh token reuse detection — if a stolen refresh token is used after the legitimate user has refreshed, the entire token family is revoked
- No tokens stored in localStorage or sessionStorage (XSS protection)
- JWKS endpoint cached locally (5-minute TTL) for sub-millisecond token validation

### 2.2 Multi-Factor Authentication

- Enforced for all admin and organization-owner accounts
- Optional but encouraged for coaches
- Optional for athletes
- MFA methods: TOTP (authenticator app), SMS (fallback), security keys (WebAuthn/FIDO2)
- MFA enforcement is configured at the Clerk organization level — MR Training inherits this configuration

### 2.3 API Keys

For service-to-service and programmatic access:
- Keys use the format `mr_live_<random_32_chars>` or `mr_test_<random_32_chars>`
- Scoped to specific permissions (minimum required)
- IP allowlisting (optional, recommended for production)
- Usage quotas (rate limits per key)
- Keys can be revoked instantly from the organization dashboard
- Keys are stored hashed (SHA-256) in the database — plaintext key is shown only once at creation time

### 2.4 Session Security

- Session timeout: 8 hours (absolute), 30 minutes (idle)
- Concurrent session limit: 5 per user (configurable per organization)
- Session termination on password change, role change, or security event
- Device fingerprinting: sessions tied to user agent and IP range with anomaly detection
- Suspicious session detection: impossible travel detection (login from New York and Tokyo within 1 hour)

---

## 3. Authorization & Access Control

### 3.1 Role-Based Access Control

Authorization uses a permission-based RBAC system. Roles are collections of permissions. Permissions are dot-separated paths:

```
training.programs.create     training.workouts.complete    athletes.read
training.programs.read       training.exercises.read        athletes.create
training.programs.update     nutrition.plans.create         athletes.metrics.read
training.programs.delete     nutrition.entries.create       billing.manage
training.programs.publish    recovery.logs.create           organization.settings.manage
```

Roles and their permissions are defined in the backend (see `05-backend-architecture.md §8.3`). The same permission definitions are mirrored in the frontend for UI-level access control (see `06-frontend-architecture.md §8.3`).

### 3.2 Multi-Tenant Isolation

Every query is scoped to the current organization. This is enforced at three levels:

1. **Application middleware** — Extracts `X-Organization-ID` from the request, validates user membership, injects into request context
2. **Repository layer** — Every database query includes `WHERE organization_id = $current_org_id`
3. **Database Row-Level Security** — PostgreSQL RLS policies as defense-in-depth:

```sql
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON athletes
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

If application code contains a bug that omits the organization filter, PostgreSQL's RLS policy prevents data leakage at the database level. This is defense in depth — no single layer is trusted to be bug-free.

### 3.3 Permission Enforcement

**API-level:** Middleware checks permissions before the handler executes. Unauthorized requests return `403 Forbidden` with no information about the protected resource.

**UI-level:** The `Can` component conditionally renders UI elements based on user permissions. A deleted button hidden in the UI is not a security control — it is a UX optimization. The real enforcement is at the API.

**Database-level:** Privileged operations (direct database access, migration execution) require separate credentials that are not available to the application. The application's database user does not have DDL permissions.

---

## 4. Data Protection

### 4.1 Encryption at Rest

| Data | Encryption | Key Management |
|------|-----------|---------------|
| PostgreSQL data directory | AES-256 (LUKS/dm-crypt or provider-managed) | Provider KMS or self-managed |
| PostgreSQL columns (athlete PII) | Application-level AES-256-GCM (pgcrypto) | Vault transit secrets engine |
| Redis (session data) | Not stored at rest (ephemeral) | N/A |
| S3 Object Storage | AES-256 (server-side encryption) | Provider-managed keys |
| Backups | AES-256 (client-side encryption before upload) | Separate backup encryption key |
| Secrets (env vars, API keys) | Encrypted in transit (TLS) and at rest (provider secrets manager) | Provider-managed |

**Application-level encryption** is applied to particularly sensitive fields:
- Athlete date of birth, phone number, address
- Health-related data (injury details, medical notes from PTs)
- Private messages between coach and athlete (end-to-end encrypted — see §4.4)

These fields are encrypted with AES-256-GCM using per-organization encryption keys. The encryption key is stored in HashiCorp Vault and never leaves the application's memory unencrypted. Database administrators with direct table access see ciphertext, not plaintext.

### 4.2 Encryption in Transit

- All external communication: TLS 1.3 (minimum TLS 1.2)
- Internal service communication: TLS 1.3 (mutual TLS for service-to-service)
- Database connections: TLS with certificate verification (`sslmode=verify-full`)
- Redis connections: TLS with stunnel or Redis TLS (Redis 6+)
- NATS connections: TLS with client certificate authentication
- HSTS header: `max-age=31536000; includeSubDomains; preload`
- Minimum TLS cipher suites: ECDHE + AES-GCM only (no CBC-mode ciphers)

### 4.3 Data Retention and Deletion

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Active athlete data | Duration of coaching relationship + 90 days | Soft delete → hard delete after 90 days |
| Deleted account data | 30 days (recovery window) | Permanent deletion from all systems |
| Audit logs | 7 years (compliance) | Time-based partition dropping after 7 years |
| AI interaction logs | 2 years | Time-based partition dropping |
| Payment records | 7 years (tax compliance) | Time-based partition dropping |
| Backup data | 30 days | Automatic lifecycle policy on object storage |
| Analytics/aggregated data | Indefinite (anonymized, non-PII) | N/A (contains no personal data) |

Athletes and coaches can request full data export (GDPR data portability) or account deletion (GDPR right to erasure) through the platform settings or by contacting privacy@mrtraining.com. Deletion requests are fulfilled within 30 days.

### 4.4 End-to-End Encrypted Messaging

Coach-athlete private messages are end-to-end encrypted:
- Each user generates an Ed25519 key pair on device registration
- Public keys are stored on the server; private keys never leave the device
- Messages are encrypted with the recipient's public key using XChaCha20-Poly1305
- The server stores and relays ciphertext — it cannot read message content
- Group messages use sender-key distribution (Signal protocol pattern)
- Key backup: encrypted key material backed up to server with a user-provided recovery phrase (optional)

---

## 5. Network Security

### 5.1 Network Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Public Internet                       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Cloudflare CDN  │
              │  - DDoS (L3/L7)  │
              │  - WAF rules     │
              │  - Bot management │
              │  - Rate limiting  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Coolify Proxy   │
              │  - TLS termination│
              │  - Reverse proxy  │
              │  - Header sanitize│
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │      Private Network      │
         │  ┌───────┐ ┌───────────┐  │
         │  │  API  │ │AI Engine  │  │
         │  └───┬───┘ └───────────┘  │
         │      │                     │
         │  ┌───┼───────────────┐    │
         │  │  ┌───┐ ┌───┐ ┌───┐│    │
         │  │  │PG │ │RDS│ │NATS││   │
         │  │  └───┘ └───┘ └───┘│    │
         │  └───────────────────┘    │
         └───────────────────────────┘
```

- No databases, caches, or message brokers are exposed to the public internet
- All internal communication occurs over private network (Hetzner vSwitch)
- Firewall rules: deny-all inbound from public internet, allow specific ports from private network only
- SSH access: key-only authentication, IP-restricted, bastion host only

### 5.2 Cloudflare WAF Rules

```
- Block requests with no User-Agent header
- Block requests from known malicious IPs (Cloudflare threat intelligence)
- Rate limit: 100 requests per 10 seconds per IP to /api/v1/auth/*
- Rate limit: 1000 requests per minute per IP to /api/v1/*
- Managed ruleset: OWASP Top 10, SQL injection, XSS, file inclusion
- Custom rules:
  - Block requests with SQL keywords in query string (defense in depth)
  - Block requests with javascript: or data: in headers
  - Challenge (JS/CAPTCHA) for requests matching bot score < 30
- IP allowlist for admin endpoints (/admin/*) restricted to office VPN
- Country-level blocking for regions with no business presence (configurable)
```

### 5.3 DDoS Protection

- Cloudflare DDoS protection (L3/L4) — automatic, always-on
- Cloudflare DDoS protection (L7) — WAF rate-based rules
- API rate limiting at application level (see `08-api-specification.md §6`)
- Graceful degradation under load: return 503 for non-critical endpoints, keep critical paths (auth, workout logging) operational
- Over-provisioned capacity: minimum 2x expected peak load for all services

---

## 6. Application Security

### 6.1 OWASP Top 10 Mitigations

| OWASP Category | Mitigation |
|---------------|-----------|
| **A01: Broken Access Control** | RBAC middleware on every endpoint, RLS at database, permission checks at all three layers |
| **A02: Cryptographic Failures** | TLS 1.3 everywhere, AES-256-GCM for sensitive fields, never roll own crypto — use well-audited libraries (libsodium, Go crypto, Web Crypto API) |
| **A03: Injection** | Parameterized queries (pgx), never string-concatenate SQL. Zod/validator sanitization for all inputs. CSP headers to prevent XSS execution. Output encoding in React (automatic via JSX) |
| **A04: Insecure Design** | Threat modeling per feature, security review in PR template, security acceptance criteria in feature specs |
| **A05: Security Misconfiguration** | Infrastructure as Code (Terraform) — no manual configuration. Docker images pinned to digests. CIS benchmarks for all services. Minimal attack surface: no unnecessary packages, ports, or services |
| **A06: Vulnerable Components** | Dependabot for automated dependency updates. Trivy scanning in CI. SBOM generation for every build. Alert on critical CVEs within 24 hours |
| **A07: Auth Failures** | Clerk-managed authentication. Password strength, breached password detection, MFA enforcement handled by Clerk. Session management with httpOnly cookies and rotation |
| **A08: Software/Data Integrity Failures** | All dependencies pinned by hash (pnpm lockfile, go.sum). Container image signing (Cosign). CI/CD pipeline integrity: no unreviewed code to production |
| **A09: Security Logging/Monitoring Failures** | Structured logging with request IDs. Audit logging for all critical actions. Real-time alerting on security events. Logs shipped off-server immediately (no local log files an attacker can erase) |
| **A10: SSRF** | Network egress filtering: application servers cannot reach internal services on unexpected ports. URL allowlisting for webhook endpoints. S3 presigned URLs instead of proxying file uploads |

### 6.2 Input Validation

All user input is validated at multiple layers:
1. **Client-side:** Zod schemas in React Hook Form for immediate feedback
2. **API gateway:** Fiber body parser with size limits, Content-Type validation
3. **Handler DTO validation:** `go-playground/validator` struct tags
4. **Domain logic:** Business rule validation in entity constructors and methods
5. **Database:** Column types, CHECK constraints, foreign key constraints

Validation rules:
- All string inputs have maximum lengths
- All numeric inputs have min/max ranges
- All enum inputs are validated against allowlists
- All UUID inputs are validated as valid UUIDs
- All date/time inputs are validated as valid ISO 8601
- Free-text inputs (notes, descriptions, messages) are sanitized (HTML stripped)
- File uploads are validated by MIME type, magic bytes, and maximum size
- No user input is ever trusted in SQL queries (parameterized queries only)

### 6.3 Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://clerk.mrtraining.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.mrtraining.com https://*.clerk.accounts.dev https://api.polar.sh wss://*.mrtraining.com;
  frame-src 'self' https://polar.sh https://*.clerk.accounts.dev;
  media-src 'self' blob: https://cdn.mrtraining.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

CSP is served as a response header and enforced by the browser. Polar's hosted checkout is opened in a separate top-level navigation (system/browser), so it does not require an inline-script exception on our pages. `connect-src` allows `https://api.polar.sh` for the Polar API, and `frame-src` allows `https://polar.sh` for any embedded Polar content.

### 6.4 Secure Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0 (deprecated; CSP is the modern mitigation)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self)
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

### 6.5 Dependency Management

- **pnpm:** Strict dependency resolution with lockfile. No dependency confusion attacks (pnpm validates integrity hashes).
- **Go modules:** `go.sum` committed to repository. All dependencies verified against `sum.golang.org` checksum database.
- **Dependabot:** Weekly automated PRs for dependency updates. Critical security patches are merged same-day.
- **Trivy scanning:** Every Docker image is scanned for known vulnerabilities in CI. Images with critical CVEs are blocked from deployment.
- **SBOM:** Software Bill of Materials generated for every build (CycloneDX format), stored alongside the container image.

---

## 7. Infrastructure Security

### 7.1 Server Hardening

All application servers are hardened against a standard baseline:
- Minimal OS installation (Alpine for containers, Ubuntu LTS minimal for bare metal)
- SSH: key-only authentication, no root login, custom port, fail2ban with 3-attempt lockout
- Firewall: deny-all inbound, allow established/related, allow specific service ports
- Automatic security updates (unattended-upgrades for OS packages)
- No password-based sudo (NOPASSWD with specific command allowlist where needed)
- Auditd enabled for critical system calls
- Read-only root filesystem for containers
- No shell access for application users inside containers

### 7.2 Secrets Management

```
┌────────────────────────────────────────────┐
│         Development                        │
│  .env.local (gitignored, never committed) │
│  GitHub Codespaces secrets                │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│         CI/CD & Staging                    │
│  GitHub Actions secrets                    │
│  HashiCorp Vault (development instance)    │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│         Production                         │
│  HashiCorp Vault (HA cluster)             │
│  Cloud provider secrets manager           │
│  Secrets injected via environment or file │
│  Automatic rotation: database creds (30d), │
│  API keys (90d), signing keys (180d)      │
└────────────────────────────────────────────┘
```

Secrets never appear in:
- Application code or configuration files
- Docker image layers
- Git repository (including history)
- Log output
- Error messages or debug endpoints
- CI/CD build logs (GitHub Actions masks secrets automatically)

### 7.3 Access Control for Infrastructure

- Production infrastructure access: break-glass procedure only
- All changes to production infrastructure go through Terraform (no manual changes)
- Database access: read-only for developers, write through application/migrations only
- SSH access: limited to designated SRE team members, session recorded
- Access reviews: quarterly audit of all infrastructure access grants
- Offboarding: access revoked within 1 hour of employee departure

---

## 8. Compliance & Privacy

### 8.1 GDPR Compliance

MR Training serves European athletes and coaches; GDPR compliance is mandatory.

**Data Processing Records:**
- Data controller: The organization (coach/academy) that collects athlete data
- Data processor: MR Training Inc. (provides the platform)
- Sub-processors: Clerk (auth), Polar (payments), Hetzner (hosting), Cloudflare (CDN), Sentry (error tracking), PostHog (analytics)
- Data Processing Agreement (DPA) available and signed with all sub-processors

**Data Subject Rights:**
- **Access:** Athletes can export all their data in machine-readable format (JSON/CSV) from Settings > Privacy
- **Rectification:** Athletes can update their profile data at any time. Coaches can correct training data.
- **Erasure:** Account deletion deletes all PII within 30 days. Aggregated/anonymized data may be retained.
- **Portability:** Full data export includes all workouts, nutrition logs, recovery data, messages, and profile data.
- **Objection:** Athletes can opt out of AI features, analytics collection, and marketing communications.

**Cookie Consent:**
- Essential cookies (authentication): no consent required
- Analytics cookies (PostHog): consent required, managed via consent banner
- Marketing cookies: not used in the product; landing page uses consent banner

### 8.2 HIPAA Considerations

For organizations that use MR Training with integrated physical therapist workflows, the platform handles Protected Health Information (PHI):

- BAA (Business Associate Agreement) available for organizations requiring HIPAA compliance
- PHI fields are encrypted at the application level with per-organization keys
- Access logging for all PHI access (who, what, when)
- Automatic session timeout for PHI-accessible sessions (15 minutes idle)
- PHI data is never used for AI training, analytics aggregation, or any non-treatment purpose

### 8.3 SOC 2

Targeting SOC 2 Type II certification covering:
- **Security:** Firewalls, MFA, encryption, access controls, vulnerability management
- **Availability:** Monitoring, disaster recovery, incident response, SLAs
- **Confidentiality:** Encryption, access controls, data classification, secure disposal

Annual third-party audit. Audit reports available to enterprise customers under NDA.

### 8.4 Vulnerability Disclosure

- Security researchers can report vulnerabilities to security@mrtraining.com
- PGP key published at mrtraining.com/.well-known/security.txt
- Bug bounty program (future): financial rewards for qualifying vulnerability reports
- Responsible disclosure: 90-day remediation window before public disclosure
- Hall of fame: public recognition for researchers who report valid vulnerabilities (with permission)

---

## 9. Incident Response

### 9.1 Incident Classification

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| **P1 — Critical** | Data breach, system compromise, widespread outage | 15 minutes | Database exposed, auth bypass, customer data leaked |
| **P2 — High** | Significant vulnerability, partial outage | 1 hour | XSS in authenticated context, API key leak, payment processing down |
| **P3 — Medium** | Minor vulnerability, limited impact | 24 hours | CSRF on low-risk endpoint, information disclosure (non-sensitive) |
| **P4 — Low** | Theoretical vulnerability, best practice deviation | 1 week | Missing security header with minimal impact, outdated library with no known exploit |

### 9.2 Incident Response Process

```
1. DETECT
   ├── Automated: monitoring alert, IDS signature, WAF event
   └── Manual: security researcher report, customer report, employee observation

2. TRIAGE (15 min)
   ├── Incident commander designated
   ├── Severity classified
   └── Communication channels opened (Slack #incidents, PagerDuty)

3. CONTAIN (immediate)
   ├── Isolate affected systems
   ├── Rotate compromised credentials
   ├── Block attacker IPs/patterns
   └── Preserve forensic evidence (system snapshots, logs, memory dumps)

4. INVESTIGATE
   ├── Determine root cause
   ├── Identify scope of compromise (data accessed, duration, attacker actions)
   ├── Preserve chain of custody for evidence
   └── Document timeline

5. REMEDIATE
   ├── Apply fix
   ├── Verify fix (penetration test, code review)
   ├── Deploy to all affected environments
   └── Scan for similar vulnerabilities across codebase

6. RECOVER
   ├── Restore services from known-good state
   ├── Verify data integrity (no unauthorized modifications)
   ├── Notify affected users (within 72 hours for GDPR)
   └── Resume normal operations

7. POST-MORTEM (within 48 hours)
   ├── Blameless root cause analysis document
   ├── Action items with owners and deadlines
   ├── Automated test to prevent regression
   └── Review with engineering team
```

### 9.3 Communication Plan

- **Internal:** Security team notified immediately. Company-wide notification within 1 hour for P1/P2 incidents. Regular status updates every 30 minutes during active incident.
- **Customers:** Notification within 72 hours for incidents involving personal data (GDPR requirement). Transparency report published within 1 week for significant incidents affecting multiple customers.
- **Regulators:** GDPR supervisory authority notified within 72 hours where required. Other regulatory notifications as required by jurisdiction.

---

## 10. Security Operations

### 10.1 Vulnerability Management

- **Automated scanning:** Dependabot (daily), Trivy (per build), OWASP ZAP (weekly, staging)
- **Manual testing:** Annual third-party penetration test by accredited firm
- **Remediation SLAs:**
  - Critical CVEs: patch within 24 hours
  - High CVEs: patch within 7 days
  - Medium CVEs: patch within 30 days
  - Low CVEs: patch within 90 days

### 10.2 Security Monitoring

Real-time monitoring for security events:
- Failed authentication spikes (brute force detection)
- Unusual API usage patterns (data scraping, enumeration attempts)
- Access from anomalous locations or IPs
- Privilege escalation attempts (admin endpoint access from non-admin users)
- Data export volumes exceeding normal patterns
- Webhook delivery failures indicating potential tampering

Logs are shipped off-server in real time (Promtail → Loki). An attacker who compromises a server cannot erase logs of their own intrusion.

### 10.3 Security Training

- All engineers complete OWASP Top 10 training annually
- Secure coding guidelines documented in `12-coding-standards.md`
- Security review is a mandatory section in every pull request template
- Quarterly security tabletop exercises (simulated incident response)
- New hire security onboarding: access control, data handling, phishing awareness

### 10.4 Penetration Testing

- Annual external penetration test (black box)
- Annual internal penetration test (white box, authenticated)
- Continuous automated scanning in CI/CD (SAST, DAST, dependency scanning)
- Pre-release security review for major features involving sensitive data
- Remediation verification: all findings are retested after remediation

### 10.5 Audit Logging

All critical actions are logged to an append-only audit trail:

| Action | Data Logged |
|--------|-----------|
| Authentication events | Login, logout, failed attempts, MFA challenges, token refresh |
| User management | Create, update, delete, role change, permission change |
| Data access | Athlete profile views, workout export, report generation |
| Data modification | Workout completion, program changes, nutrition plan edits |
| Payment events | Subscription creation, payment processing, refunds |
| Admin actions | Organization settings changes, user impersonation, feature flag changes |
| API key usage | Key creation, usage, revocation |
| Security events | Permission denied, rate limit exceeded, WAF blocks |

Audit logs include: timestamp, actor (user ID), action, target resource, organization ID, IP address, user agent, request ID. Logs are immutable — the application cannot modify or delete audit log entries.

### 10.6 Regulatory Requirements

| Requirement | Standard | Implementation |
|-------------|---------|---------------|
| Data at rest encryption | SOC 2, GDPR | AES-256 | 
| Data in transit encryption | SOC 2, PCI DSS | TLS 1.3 |
| Access control | SOC 2, HIPAA | RBAC + RLS |
| Audit logging | SOC 2, HIPAA | Append-only audit log |
| Vulnerability management | SOC 2 | Automated scanning + annual pentest |
| Incident response | SOC 2, GDPR | Documented plan, tested quarterly |
| Data retention | GDPR | Configurable retention policies |
| Data portability | GDPR | Self-service export in JSON/CSV |
| Right to erasure | GDPR | Self-service deletion, 30-day hard delete |
| Breach notification | GDPR | Within 72 hours |
| Sub-processor disclosure | GDPR | Listed in DPA, updated on change |
| Business continuity | SOC 2 | Backup strategy, DR plan, RTO/RPO targets |
