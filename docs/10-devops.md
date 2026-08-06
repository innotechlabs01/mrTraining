# MR Training — DevOps & Infrastructure

**Version 1.0 — 2026**

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [CI/CD Pipeline](#2-cicd-pipeline)
3. [Containerization](#3-containerization)
4. [Orchestration & Deployment](#4-orchestration--deployment)
5. [Monitoring & Observability](#5-monitoring--observability)
6. [Logging](#6-logging)
7. [Backup & Disaster Recovery](#7-backup--disaster-recovery)
8. [Infrastructure as Code](#8-infrastructure-as-code)
9. [Environment Strategy](#9-environment-strategy)

---

## 1. Infrastructure Overview

### 1.1 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Cloud Provider | Hetzner Cloud | Primary hosting — price/performance for CPU-optimized workloads |
| Container Runtime | Docker | Application packaging and isolation |
| Orchestration | Coolify | Deployment management, SSL, reverse proxy, environment management |
| CI/CD | GitHub Actions | Build, test, deploy pipeline |
| Infrastructure as Code | Terraform | Server provisioning, DNS, networking, firewall |
| Database | PostgreSQL 16 | Primary data store (Hetzner managed or self-managed) |
| Cache | Redis 7 (KeyDB) | Session store, cache, rate limiting, job queue backend |
| Message Broker | NATS 2.10 | Inter-service event bus with JetStream persistence |
| Object Storage | Hetzner Object Storage (S3-compatible) | Media files, backups, static assets |
| CDN | Cloudflare | DDoS protection, caching, SSL termination, WAF |
| Monitoring | Prometheus + Grafana | Metrics collection and visualization |
| Logging | Loki + Promtail | Centralized log aggregation |
| Alerting | Grafana Alertmanager | Incident notification (PagerDuty/Slack/Email) |
| Secrets | HashiCorp Vault (future) / GitHub Secrets | Credential management |

### 1.2 Network Architecture

```
                          Internet
                             │
                             ▼
                    ┌─────────────────┐
                    │   Cloudflare     │  DDoS, WAF, CDN, SSL termination
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Coolify Proxy   │  Reverse proxy, load balancing
                    │  (Traefik/Caddy) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ API (Go) │  │Web (Next)│  │Mobile API│
        │ Port 8080│  │ Port 3000│  │ (gRPC)   │
        └────┬─────┘  └──────────┘  └──────────┘
             │
    ┌────────┼────────┬──────────┐
    │        │        │          │
    ▼        ▼        ▼          ▼
┌───────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│Postgre│ │Redis │ │ NATS │ │S3 Storage│
│SQL 16 │ │  7   │ │ 2.10 │ │          │
└───────┘ └──────┘ └──────┘ └──────────┘
```

All internal service communication occurs within a private network (Hetzner vSwitch). Only the Coolify proxy and the CDN endpoint are exposed to the public internet. Database, Redis, and NATS are never directly accessible from outside the private network.

### 1.3 Server Sizing (Production)

| Service | vCPUs | RAM | Storage | Count | Notes |
|---------|-------|-----|---------|-------|-------|
| API Server (Go) | 4 | 8 GB | 40 GB NVMe | 2-3 | Horizontally scaled behind load balancer |
| Web Frontend (Next.js) | 2 | 4 GB | 40 GB NVMe | 1-2 | CDN handles static assets |
| AI Engine | 4-8 | 16 GB | 80 GB NVMe | 1-2 | GPU desirable for self-hosted models |
| PostgreSQL | 4 | 16 GB | 200 GB NVMe | 1 (+ replica) | Volume scales with tenant count |
| Redis | 2 | 8 GB | 40 GB NVMe | 1 (+ sentinel) | Memory-bound |
| NATS | 2 | 4 GB | 40 GB NVMe | 1-3 | Clustered for HA |
| Worker (asynq) | 2 | 4 GB | 40 GB NVMe | 1-2 | Background job processing |

---

## 2. CI/CD Pipeline

### 2.1 Pipeline Stages

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐
│  Lint   │───>│   Test   │───>│   Build   │───>│  Deploy  │───>│  Verify   │
│         │    │          │    │           │    │  (Stage) │    │ (Smoke)   │
└─────────┘    └──────────┘    └───────────┘    └──────────┘    └───────────┘
                                                       │
                                               ┌───────┴───────┐
                                               │               │
                                               ▼               ▼
                                         ┌──────────┐   ┌──────────┐
                                         │  Deploy  │   │ Rollback │
                                         │  (Prod)  │   │  (Auto)  │
                                         └──────────┘   └──────────┘
```

### 2.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint           # Biome linting
      - run: pnpm typecheck      # TypeScript validation
      - run: cd apps/api && go vet ./...

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: mrtraining_test }
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm test           # Vitest: unit + integration
      - run: cd apps/api && go test -race -coverprofile=coverage.out ./...
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: '**/coverage.out' }

  e2e:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: pnpm --filter web test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: apps/web/playwright-report }

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/mr-training/api:${{ github.sha }}
          file: apps/api/Dockerfile
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/mr-training/web:${{ github.sha }}
          file: apps/web/Dockerfile

  deploy-staging:
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          curl -X POST https://coolify.example.com/api/v1/deploy \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}" \
            -d '{"service": "mr-training-staging", "tag": "${{ github.sha }}"}'

  deploy-production:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production (blue-green)
        run: |
          curl -X POST https://coolify.example.com/api/v1/deploy \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}" \
            -d '{"service": "mr-training-production", "tag": "${{ github.sha }}", "strategy": "blue-green"}'
```

### 2.3 Deployment Strategies

**Staging:** Rolling update — zero downtime for development/testing environments.

**Production:** Blue-green deployment:
1. New version deployed to inactive environment (blue)
2. Health checks run against blue: `/health`, `/metrics`, smoke test suite
3. If healthy, Coolify swaps traffic to blue
4. Old version (green) kept warm for 1 hour for instant rollback
5. After 1 hour with no rollback trigger, green environment is decommissioned

**Rollback triggers (automatic):**
- Error rate exceeds 5% within 5 minutes of deploy
- P95 latency increases by > 50% from baseline
- Health check fails 3 consecutive times
- Database migration fails

### 2.4 Database Migrations

Migrations run as a pre-deployment step in the CI pipeline:

1. Migration script validates against production database snapshot
2. Backward compatibility check: no DROP COLUMN, no RENAME COLUMN without intermediate migration
3. Migration applied with `golang-migrate up`
4. If migration fails, deployment is aborted and the previous version continues serving

Migration rules:
- Every migration has a corresponding down migration (tested in CI)
- DDL changes are deployed separately from application code changes
- Destructive changes (DROP, RENAME) use expand-contract pattern: add new column → deploy code → migrate data → remove old column → deploy code
- Migrations are run during low-traffic windows (configurable per organization timezone)
- Database is backed up immediately before migration execution

---

## 3. Containerization

### 3.1 Dockerfile Standards

All services use multi-stage builds to minimize image size:

```dockerfile
# apps/api/Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /api cmd/api/main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata curl
COPY --from=builder /api /usr/local/bin/api
COPY migrations/ /migrations/
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
ENTRYPOINT ["/usr/local/bin/api"]
```

### 3.2 Docker Compose (Development)

```yaml
# docker-compose.yml (development environment)
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: mrtraining
      POSTGRES_PASSWORD: mrtraining
      POSTGRES_DB: mrtraining
    ports: ['5432:5432']
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U mrtraining']
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s

  nats:
    image: nats:2.10-alpine
    command: -js -m 8222
    ports:
      - '4222:4222'   # Client
      - '8222:8222'   # HTTP monitoring
    volumes:
      - nats_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - '9000:9000'   # API
      - '9001:9001'   # Console
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  nats_data:
  minio_data:
```

### 3.3 Image Security

- Base images pinned to specific digests, not tags
- No packages installed in runtime stage beyond ca-certificates and tzdata
- Containers run as non-root user (UID 1000)
- Read-only root filesystem where possible
- Images scanned with Trivy for vulnerabilities in CI
- No secrets in image layers — all configuration via environment variables or mounted secrets

---

## 4. Orchestration & Deployment

### 4.1 Coolify Configuration

Coolify manages the deployment lifecycle:

```
┌─────────────────────────────────────────────┐
│              Coolify Dashboard               │
│                                              │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ Services     │  │ Destinations │           │
│  │ - api        │  │ - Hetzner 1  │           │
│  │ - web        │  │ - Hetzner 2  │           │
│  │ - ai-engine  │  │ - Hetzner 3  │           │
│  │ - worker     │  └─────────────┘           │
│  └─────────────┘                             │
│                                              │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ Databases    │  │ SSL Certs    │           │
│  │ - PostgreSQL │  │ - Auto-renew │           │
│  │ - Redis      │  └─────────────┘           │
│  └─────────────┘                             │
└─────────────────────────────────────────────┘
```

Coolify features used:
- **Auto-deploy on push** — GitHub webhook triggers deployment
- **SSL management** — Automatic Let's Encrypt certificate provisioning and renewal
- **Health checks** — TCP/HTTP health checks with auto-restart
- **Rolling updates** — Zero-downtime deploys with configurable batch size
- **Rollback** — One-click rollback to any previous deployment
- **Resource limits** — Per-service CPU and memory limits
- **Private networking** — Services communicate via internal Docker networks

### 4.2 Service Discovery

Services discover each other via Coolify's internal DNS:
- `api.mr-training.internal:8080`
- `web.mr-training.internal:3000`
- `ai-engine.mr-training.internal:9090`
- `worker.mr-training.internal:9091`

External service endpoints (PostgreSQL, Redis, NATS) are configured via environment variables, allowing point-and-click switching between managed and self-hosted instances.

### 4.3 Scaling Strategy

**Horizontal scaling** (stateless services):
- API servers: scaled based on CPU utilization (> 70% triggers scale-up)
- Workers: scaled based on queue depth (> 1,000 pending jobs triggers scale-up)
- AI Engine: scaled based on request queue latency (p95 > 10s triggers scale-up)

**Vertical scaling** (stateful services):
- PostgreSQL: scaled by increasing the server plan (managed database handles this)
- Redis: scaled by increasing memory allocation
- NATS: scaled horizontally (NATS cluster with Raft consensus)

**Autoscaling** (future Coolify feature or custom implementation):
- Minimum: 1 instance per service
- Maximum: 5 instances API, 3 instances AI Engine, 3 instances Worker
- Cooldown: 5 minutes between scaling events

---

## 5. Monitoring & Observability

### 5.1 Metrics Architecture

```
┌──────────────────────────────────────────────────────┐
│                 Application Services                  │
│  ┌──────┐  ┌──────┐  ┌──────────┐  ┌──────┐        │
│  │ API  │  │ Web  │  │AI Engine │  │Worker│        │
│  └──┬───┘  └──┬───┘  └────┬─────┘  └──┬───┘        │
│     │         │           │            │             │
│     │    OpenTelemetry SDK (OTLP over gRPC)          │
│     └─────────┴───────────┴────────────┘             │
│                      │                                │
└──────────────────────┼────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              OpenTelemetry Collector                  │
│  Receivers: OTLP, Prometheus, Jaeger                  │
│  Processors: batch, memory_limiter, attributes        │
│  Exporters: Prometheus Remote Write, Loki, Tempo      │
└───────────┬──────────────┬──────────────┬────────────┘
            │              │              │
            ▼              ▼              ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │Prometheus│  │   Loki   │  │  Tempo   │
     │ (Metrics)│  │  (Logs)  │  │ (Traces) │
     └────┬─────┘  └────┬─────┘  └────┬─────┘
          │             │             │
          └─────────────┼─────────────┘
                        ▼
               ┌────────────────┐
               │    Grafana     │
               │ (Dashboards +  │
               │  Alerting)     │
               └────────────────┘
```

### 5.2 Key Metrics

**Golden Signals (RED Method):**

| Signal | Metric | Target |
|--------|--------|--------|
| Rate | Requests per second | Tracked, baseline per service |
| Errors | Error rate (5xx) | < 0.5% |
| Duration | P95 latency | < 200ms (API), < 2s (AI gen) |

**Infrastructure Metrics:**

| Service | Metric | Alert Threshold |
|---------|--------|----------------|
| PostgreSQL | Connections used | > 80% of max_connections |
| PostgreSQL | Replication lag | > 5 seconds |
| Redis | Memory used | > 80% of maxmemory |
| NATS | Pending messages | > 10,000 |
| All services | CPU utilization | > 85% sustained (5 min) |
| All services | Memory utilization | > 85% |
| Disk | Free space | < 20% |

**Business Metrics (from Product Vision):**

| Metric | Dashboard Panel | Alert |
|--------|----------------|-------|
| DAU/MAU ratio | Weekly trend | < 30% drop week-over-week |
| Athlete session completions | Daily count | < 50% of 4-week average |
| Payment failure rate | Hourly count | > 5% of total payments |
| Sign-up conversion | Daily funnel | < 5% visit-to-signup |

### 5.3 Grafana Dashboards

Standard dashboards provisioned for every environment:

1. **API Overview** — Request rate, latency percentiles, error rate, status code distribution, endpoint-level breakdown
2. **Database** — Connection count, query throughput, slow queries, replication lag, cache hit ratio, dead tuples
3. **Redis** — Memory usage, hit/miss ratio, connected clients, eviction count, command latency
4. **NATS** — Published/delivered messages, pending messages, consumer lag, connection count
5. **AI Engine** — Request rate by type, latency by provider, cost by provider, token usage, cache hit rate
6. **Business KPIs** — Active users, session completions, revenue (MRR), conversion funnel, churn rate
7. **SLO Dashboard** — Error budget burn rate, SLO compliance for each service

### 5.4 Alerting Rules

```
groups:
  - name: mr-training-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "Error rate > 5% for 5 minutes"

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels: { severity: critical }

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels: { severity: warning }

      - alert: DiskSpaceLow
        expr: disk_free_percent < 20
        for: 5m
        labels: { severity: warning }
```

Alert routing:
- **Critical (P1):** PagerDuty → on-call engineer (15-min response SLA)
- **Warning (P2):** Slack #alerts channel → acknowledged within 1 hour
- **Info (P3):** Slack #monitoring channel → reviewed during daily standup

---

## 6. Logging

### 6.1 Log Structure

All services emit structured JSON logs:

```json
{
  "level": "info",
  "timestamp": "2026-01-15T08:30:00Z",
  "service": "api",
  "request_id": "req_a1b2c3d4e5f6",
  "organization_id": "org_xyz789",
  "user_id": "user_abc123",
  "method": "POST",
  "path": "/api/v1/training/workouts",
  "status": 201,
  "duration_ms": 87,
  "message": "workout created"
}
```

Required fields on every log entry:
- `level` — debug, info, warn, error
- `timestamp` — ISO 8601 in UTC
- `service` — service name (api, web, ai-engine, worker)
- `request_id` — UUID v4 for request correlation
- `organization_id` — tenant identifier (when applicable)

### 6.2 Log Levels

| Level | Usage |
|-------|-------|
| `error` | Unhandled exceptions, failed operations, data inconsistency, infrastructure failures |
| `warn` | Rate limit exceeded, deprecated API usage, retry attempts, degraded functionality |
| `info` | Request/response lifecycle, user actions, state transitions, deployment events |
| `debug` | Detailed diagnostics enabled only in development and debugging sessions |

Production logging level: `info`. Debug logging is never enabled in production due to the volume of athlete data it would expose.

### 6.3 Log Aggregation

```
Application → stdout/stderr (Docker JSON log driver)
                    │
                    ▼
            Promtail (Docker socket)
                    │
                    ▼
              Loki (indexed, compressed)
                    │
                    ▼
         Grafana (LogQL queries, dashboards)
```

Retention: 30 days for production logs, 7 days for staging.

### 6.4 Sensitive Data in Logs

The logging layer automatically redacts sensitive data before emission:
- JWT tokens → `[REDACTED]`
- Passwords, API keys, secrets → `[REDACTED]`
- Credit card numbers → `[REDACTED]` (but these never reach the server; Stripe.js handles them client-side)
- Full email addresses → `a***n@example.com` (prefix preserved for debugging)
- Athlete names in debug logs → `athlete_abc123` (UUID reference)

Redaction is implemented at the logger configuration level, not at each log call site — no developer can accidentally log sensitive data by forgetting to redact.

---

## 7. Backup & Disaster Recovery

### 7.1 Backup Schedule

| Data | Frequency | Retention | Method |
|------|----------|-----------|--------|
| PostgreSQL | Hourly (WAL), Daily (full) | 30 days | `pg_dump` + WAL archiving |
| Redis | Daily (RDB snapshot) | 7 days | `SAVE` + snapshot to S3 |
| NATS JetStream | Continuous (stream replication) | N/A | NATS clustering |
| Object Storage | Continuous (provider-managed) | 90 days | Provider replication |
| Configuration (Terraform state) | Every apply (versioned) | Indefinite | Terraform Cloud/Backend |
| Application code | Every push | Indefinite | GitHub |

### 7.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | < 1 hour |
| Recovery Point Objective (RPO) | < 1 hour (PostgreSQL WAL), < 24 hours (full backup) |

### 7.3 Disaster Recovery Procedure

1. **Detect:** Monitoring alert fires (database unavailable, all API instances unhealthy)
2. **Declare:** Incident commander declares disaster via PagerDuty
3. **Restore:** 
   - Terraform provisions new infrastructure in secondary region
   - Latest database backup restored
   - WAL replayed to point-of-failure
   - Application containers deployed from latest images
4. **Verify:** Smoke test suite runs against restored environment
5. **Switch:** DNS updated to point to secondary region (Cloudflare)
6. **Communicate:** Status page updated, customer notification sent

### 7.4 Backup Testing

Backup integrity is verified monthly:
- Full database restore to a temporary instance
- Application smoke tests run against restored data
- Data integrity checks: row counts, referential integrity, critical business data verification
- Failed restores trigger an incident and remediation

---

## 8. Infrastructure as Code

### 8.1 Terraform Architecture

```
terraform/
├── environments/
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
├── modules/
│   ├── server/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── database/
│   │   ├── main.tf
│   │   └── variables.tf
│   ├── network/
│   │   ├── main.tf
│   │   └── variables.tf
│   └── dns/
│       ├── main.tf
│       └── variables.tf
└── backend.tf
```

### 8.2 Managed Resources

- Hetzner Cloud servers (CX42, CX52, CPX51)
- Hetzner Cloud Networks (private vSwitch)
- Hetzner Cloud Firewalls
- Hetzner Cloud Load Balancers
- Hetzner managed PostgreSQL (or self-managed instances)
- Cloudflare DNS records, page rules, WAF rules
- Coolify server configuration (bootstrapped, not fully managed by Terraform)

### 8.3 Terraform Workflow

```
1. Developer modifies Terraform configuration
2. PR opened → Terraform plan runs in CI (comment on PR)
3. Reviewer approves → PR merged to main
4. Terraform apply runs automatically (staging) or with approval gate (production)
5. State stored in Terraform Cloud (remote backend)
6. State locked during apply to prevent concurrent modifications
```

---

## 9. Environment Strategy

### 9.1 Environment Matrix

| Environment | Purpose | Data | Deploy Trigger | Access |
|-------------|---------|------|----------------|--------|
| **Development** | Local development | Synthetic/seed data | Manual (`docker compose up`) | Developer machines |
| **Staging** | Pre-production validation | Anonymized production subset | Push to `develop` | Internal team + testers |
| **Production** | Live application | Real user data | Push to `main` | End users |

### 9.2 Environment Parity

Staging mirrors production in:
- Server specifications (CPU, RAM, disk type)
- Database version and configuration
- Third-party service integrations (sandbox/test mode)
- SSL/TLS configuration
- Monitoring and alerting (separate Grafana instance)

Staging differs from production in:
- Scale: single instances instead of multi-instance (cost optimization)
- Data: anonymized subset of production data, refreshed weekly
- External services: test mode (Stripe test mode, Paddle sandbox, Clerk development instance)
- Alerting: internal Slack only, no PagerDuty

### 9.3 Feature Flags

Feature rollout uses a flag-based system rather than environment branching:

```
LaunchDarkly / custom feature flag service
├── ai-workout-generator        → 5% of coaches (beta)
├── ai-nutrition-planner        → 0% (development only)
├── social-login-google         → 100% (GA)
├── social-login-apple          → 100% (GA)
├── dark-mode                   → 100% (GA)
├── offline-mode                → 50% (gradual rollout)
└── marketplace                 → 0% (not yet launched)
```

Feature flags enable:
- Dark launches (deploy code, disable flag, enable when ready)
- Percentage rollouts (gradual exposure to mitigate risk)
- Kill switches (instant disable without deploy)
- A/B testing (different experiences for different user segments)
- Environment-specific behavior (debug tools enabled in staging)

### 9.4 Maintenance Mode

When maintenance is required (database upgrade, infrastructure migration):

1. `MAINTENANCE_MODE=true` flag set
2. All API requests return `503 Service Unavailable` with `Retry-After: 3600`
3. Frontend displays a maintenance page with estimated completion time
4. Webhook deliveries are queued and delivered after maintenance
5. Background jobs are paused (no new jobs enqueued, running jobs complete gracefully)
6. Database maintenance performed
7. Smoke tests verify functionality
8. `MAINTENANCE_MODE=false` restores normal operation
