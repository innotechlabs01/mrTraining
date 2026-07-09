# MR Training — The Operating System for Sports Coaching

MR Training is a premium SaaS platform that unifies the entire ecosystem of athletic development — coaches, athletes, academies, sports clubs, nutritionists, and physical therapists — into one seamless experience.

## Architecture

Monorepo with three applications and shared packages:

```
apps/
├── web/          # Next.js 14+ (App Router) frontend
├── mobile/       # Flutter mobile app (iOS + Android)
└── api/          # Go (Fiber) backend API

packages/
├── shared/       # Shared TypeScript types, DTOs, utilities
├── ui/           # Design system components (shadcn/ui + Tailwind)
└── config/       # Shared configuration (ESLint, TypeScript, Tailwind)
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14+, React 18+, TypeScript 5.x, Tailwind CSS 3.4+, shadcn/ui, TanStack Query, Zustand |
| Mobile | Flutter 3.24+, Riverpod, Drift (SQLite), GoRouter, Dio |
| Backend API | Go 1.22+, Fiber 2.x, pgx 5.x, NATS, Redis, gRPC |
| Database | PostgreSQL 16+ |
| Auth | Clerk (organization-aware, social SSO) |
| Payments | Paddle (subscriptions, one-time) |
| Infrastructure | Docker, GitHub Actions, Coolify, Hetzner, Terraform |
| Monitoring | Prometheus, Grafana, Loki, OpenTelemetry |

## Documentation

| Document | Description |
|----------|------------|
| [MASTER_PROMPT.md](./MASTER_PROMPT.md) | Architectural constitution — principles, philosophy, rules |
| [00-product-vision.md](./00-product-vision.md) | Product vision, personas, modules, roadmap, business model |
| [01-brand-guidelines.md](./01-brand-guidelines.md) | Brand identity, colors, typography, voice & tone, motion |
| [02-design-system.md](./02-design-system.md) | Design tokens, layout, components, dark mode, responsive |
| [03-ux-workflows.md](./03-ux-workflows.md) | UX principles, onboarding, coach/athlete/admin workflows, AI flows |
| [04-database-design.md](./04-database-design.md) | PostgreSQL schema, indexing, partitioning, migration strategy |
| [05-backend-architecture.md](./05-backend-architecture.md) | Go Clean Architecture, DDD, CQRS, event-driven patterns |
| [06-frontend-architecture.md](./06-frontend-architecture.md) | Next.js App Router, Server Components, state management, testing |
| [07-mobile-architecture.md](./07-mobile-architecture.md) | Flutter Clean Architecture, Riverpod, offline-first, Drift |
| [08-api-specification.md](./08-api-specification.md) | RESTful API design, endpoints, webhooks, rate limiting, SDK |
| [09-ai-specification.md](./09-ai-specification.md) | AI/ML architecture, models, training pipelines, integration |
| [10-devops.md](./10-devops.md) | CI/CD, Docker, Coolify, monitoring, infrastructure as code |
| [11-security.md](./11-security.md) | Security architecture, OWASP, data protection, compliance |
| [12-coding-standards.md](./12-coding-standards.md) | Coding conventions for TypeScript, Go, Dart, SQL |
| [13-testing.md](./13-testing.md) | Testing strategy, coverage targets, tools, patterns |

## Quick Start

### Prerequisites

- Node.js 20+ with pnpm 9+
- Go 1.22+
- Flutter 3.24+
- Docker & Docker Compose
- PostgreSQL 16+ (or Docker)

### Environment Setup

```bash
# Clone repository
git clone <repo-url>
cd mr-training

# Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local with your Clerk, Paddle, and database credentials

# Install frontend dependencies
pnpm install

# Start development infrastructure (PostgreSQL, Redis, NATS)
docker compose up -d

# Start web frontend
pnpm --filter web dev

# Start API server
cd apps/api && go run cmd/api/main.go

# Start mobile app
cd apps/mobile && flutter run
```

### Development Workflow

1. Understand the requirement
2. Design the workflow before the UI
3. Model the domain before the database
4. Define the API contract before implementation
5. Implement frontend and backend independently against the contract
6. Test at every layer
7. Review against Product Principles (see MASTER_PROMPT.md)
8. Deploy incrementally

### Available Commands

```bash
# Web
pnpm --filter web dev           # Start Next.js dev server
pnpm --filter web build         # Production build
pnpm --filter web lint          # Lint with Biome
pnpm --filter web typecheck     # TypeScript check
pnpm --filter web test          # Run Vitest tests
pnpm --filter web test:e2e      # Run Playwright E2E tests

# API
cd apps/api
go run cmd/api/main.go          # Start API server
go test ./...                   # Run all tests
go run cmd/migrate/main.go      # Run database migrations

# Mobile
cd apps/mobile
flutter run                     # Start on connected device
flutter test                    # Run unit/widget tests
flutter build apk               # Build Android APK
flutter build ios               # Build iOS
```

## Contributing

See [12-coding-standards.md](./12-coding-standards.md) for code conventions and [13-testing.md](./13-testing.md) for testing requirements. All contributions must follow the development workflow documented in [MASTER_PROMPT.md](./MASTER_PROMPT.md).

## License

Proprietary. All rights reserved. MR Training Inc.
# mrTraining
