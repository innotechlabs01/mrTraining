## Testing Capabilities

**Strict TDD Mode**: enabled
**Detected**: 2026-08-26

### Test Runner

- Command: `pnpm test` / `node_modules/.bin/jest` / `go test ./...`
- Framework: Jest 30 with ts-jest for web/mobile; Go test for API

### Test Layers

| Layer | Available | Tool |
| Unit | ✅ | jest, go test |
| Integration | ✅ | jest, go test |
| E2E | ✅ | jest e2e config |

### Coverage

- Available: ❌ unknown
- Command: —

### Quality Tools

| Tool | Available | Command |
| Linter | ✅ | pnpm lint / next lint / eslint src |
| Type checker | ✅ | tsc --noEmit |
| Formatter | ❌ | — |
