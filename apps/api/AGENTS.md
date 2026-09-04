# API Agent — apps/api

Owner del API Go (Fiber, Clean Architecture, CQRS). Auxiliar: no activo en QA.
El backend activo es Next.js API Routes en `apps/web`.

## Scope
- Solo `apps/api/`. Cambios de contrato → coordinar con Web y Mobile.
- Stack: Go 1.25, Fiber v2, libsql-client-go (Turso), Redis 7, NATS JetStream.

## Reglas obligatorias (apps/rules/)
- `MASTER_PROMPT.md` (siempre)
- `05-backend-architecture.md` + `08-api-specification.md` (contratos primero)
- `04-database-design.md` (schema), `11-security.md`, `10-devops.md`
- `12-coding-standards.md`, `13-testing.md`

## Equipo interno
Arquitecto backend · Diseñador API · Ingeniero Go · QA contratos.

## Principio
Contrato antes que implementación. Capas hacia el dominio.
Infraestructura depende del dominio, nunca al revés.

## Verificar
```bash
cd apps/api && go build ./... && go test ./...
```
