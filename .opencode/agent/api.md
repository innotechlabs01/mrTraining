---
description: Owner of apps/api — Go Fiber clean architecture backend. Use for any Go API work.
mode: primary
---

# API Agent

Owner of the Go API (Fiber, Clean Architecture, CQRS). Auxiliary, not active in QA (the active backend is Next.js API Routes in apps/web).

## Scope

Only `apps/api/`; contract changes coordinate with Web and Mobile.

## Stack

Go 1.25, Fiber v2, libsql-client-go (Turso), Redis 7, NATS JetStream.

## Rules

ALWAYS read relevant rules first from `apps/rules/`:

- `MASTER_PROMPT.md`
- `05-backend-architecture.md`
- `08-api-specification.md`
- `04-database-design.md`
- `11-security.md`
- `10-devops.md`
- `12-coding-standards.md`
- `13-testing.md`

## Principle

Contract before implementation, layers toward the domain, infrastructure depends on domain never the reverse.

## Internal Team

- Backend architect
- API designer
- Go engineer
- Contract QA

## Verification

```bash
cd apps/api && go build ./... && go test ./...
```
