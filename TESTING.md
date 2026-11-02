# Test Suite Quick Reference

## Local Commands

```bash
# Run all Go tests
cd apps/api && go test ./internal/... -v -race

# Run all Web tests
cd apps/web && pnpm test && pnpm lint && pnpm build

# Run E2E tests (requires running servers)
cd apps/web && pnpm test:e2e

# Full suite (what CI runs)
make test-all
```

## CI Pipeline (`.github/workflows/ci.yml`)

| Job | Runs On | What It Does |
|-----|---------|--------------|
| `go-api-tests` | push/PR | Go build, test, lint, race detector |
| `web-tests` | push/PR | Web lint, typecheck, build, unit tests |
| `all-tests-passed` | after above | Blocks push if any job fails |
| `deploy-preview` | PR merged | Deploy preview |
| `deploy-production` | push to main | Deploy production |

## Pre-commit Hook (`.githooks/pre-commit`)

Runs automatically on `git commit`:
- `go mod tidy` check
- `go build ./...` 
- Go unit tests (short)
- `pnpm lint`
- `pnpm build` (type check)

Install: `cp .githooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`

## E2E Tests Requirements

Playwright tests need:
1. Go API running on `localhost:8080`
2. Web running on `localhost:3000`
3. Clerk test users configured

```bash
# Terminal 1: Start Go API
cd apps/api && go run cmd/api/main.go

# Terminal 2: Start Web
cd apps/web && pnpm dev

# Terminal 3: Run E2E
cd apps/web && pnpm test:e2e
```

## Test Users (Configure in Clerk Dashboard)

| Role | Email | Password |
|------|-------|----------|
| Coach | `coach@test.com` | `test123` |
| Athlete | `athlete@test.com` | `test123` |

Add these in Clerk Dashboard → Users → Create test users.

## Bypass Emergency (Use Sparingly)

```bash
# Skip pre-commit hook (NOT recommended)
git commit --no-verify -m "emergency fix"

# Skip CI (NOT recommended)
git push --no-verify
```

## Rule Enforcement

**NEVER push without tests passing.** CI will block the push/merge if:
- Any Go test fails
- Any Web lint/typecheck fails
- Go build fails
- Go race detector finds issues
- `go mod tidy` needed