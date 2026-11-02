# Fase 0 — Higiene de baseline — Design Spec

> **Template:** copia de `TEMPLATE-coach-feature.md`. Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. No incluye código de implementación, solo planificación desglosada en slices listos para PR.

---

## 1. Problema

El backend no pasa `go vet` ni `go test ./...` por dos causas: (1) `apps/api/internal/application/running/service_test.go` tiene un marcador de merge sin resolver (`<<<<<<< HEAD` / `>>>>>>> origin/dev`) en la línea 706; (2) usa la firma vieja `NewService(repo)` de 1 argumento mientras `service.go` declara `NewService(repo domain.Repository, db *sql.DB)` de 2 argumentos. Los callers en `integration/running/http_e2e_test.go:35` y los tests de handlers usan la firma de 1 argumento. Esto bloquea toda validación backend y, por ende, todas las fases siguientes.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| dev-backend | Go API (apps/api) | Dejar `go build`, `go vet`, `go test` verdes en backend |

### Acceptance Criteria

- [ ] **AC-0.1:** Given `service_test.go` con marcador de merge, When se limpian los marcadores `<<<<<<<`/`=======`/`>>>>>>>`, Then el archivo compila y `go vet` no reporta ese paquete.
- [ ] **AC-0.2:** Given `NewService(repo domain.Repository, db *sql.DB)`, When se actualizan todos los callers a 2 argumentos, Then `go build ./...` compila sin errores de firma.
- [ ] **AC-0.3:** Given callers actualizados, When se ejecutan `go build ./... && go vet ./... && go test ./...` en `apps/api`, Then todo verde (baseline archivada).
- [ ] **AC-0.4:** Given gate CI local, When se añade `go test ./...` no rojo como prerrequisito, Then no se avanza a Fase 1 sin baseline verde.

---

## 3. Criterios UX

No aplica (fase de backend/tests, sin UI).

---

## 4. Flujo de usuario

No aplica (fase de backend/tests).

---

## 5. Diseño (la solución)

### Slices de trabajo (PR-ready, en orden)

1. **Slice 0.1 — Limpiar merge conflict en service_test.go**: remover marcadores `<<<<<<< HEAD` / `=======` / `>>>>>>> origin/dev` (líneas 706-1635), dejar un bloque coherente de pruebas (quedarse con la rama correcta o fusionar ambas según intención; no se inventa lógica, solo se resuelve el conflicto sintáctico).
2. **Slice 0.2 — Ajustar firma NewService a `(repo, db)`**: verificar que `service.go` ya declara 2 args; actualizar callers en `integration/running/http_e2e_test.go:35` y tests de handlers a `NewService(repo, db)`.
3. **Slice 0.3 — Ejecutar y archivar baseline**: `go build ./...`, `go vet ./...`, `go test ./...` en `apps/api`; guardar salida como evidencia de baseline.
4. **Slice 0.4 — Gate CI local**: agregar paso que impida avanzar si `go test ./...` está rojo (documentado en plan, no necesariamente en CI.yml).

### Estructura de rutas / screens

No aplica.

### Componentes

No aplica.

### Types

No se tocan tipos de dominio; solo firma de constructor de servicio.

---

## 6. API (si aplica)

No aplica (backend interno, sin cambio de contrato HTTP).

| Método | Path | Purpose |
|---|---|---|
| — | — | — |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- No se reescribe `service.go` ni su lógica.
- No se agregan nuevas pruebas de negocio, solo se resuelve el conflicto y se ajusta la firma.
- No se toca `apps/web` ni `apps/mobile`.
- No se crean migraciones de base de datos.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Elegir la rama equivocada al resolver el merge (HEAD vs origin/dev) | Medio | Revisar git log y el intent de cada bloque antes de decidir qué pruebas conservar. |
| Otros callers de NewService fuera de los identificados | Bajo | `grep` exhaustivo en `apps/api` antes de dar por cerrado el slice. |
| go test requiere Postgres local (integración) y falla sin DB | Medio | Marcar tests de integración como `t.Skip` sin DB; baseline = unit tests + build + vet verdes. |

---

## 9. Referencias

- Plan maestro: `docs/plans/closeout-plan-2026-11-02.md` §Fase 0.
- Reglas: `apps/rules/05-backend-architecture.md`, `apps/rules/13-testing.md`, `apps/rules/12-coding-standards.md`.

---

## Definition of Done (Fase 0)

- `go build ./...` verde
- `go vet ./...` verde
- `go test ./...` verde (unit + integración con skip si no hay PG)
- Baseline archivada como evidencia
- Gate CI local documentado

---

**Rol responsable:** `dev-backend`  
**Tiempo estimado:** 1-2 días  
**Prioridad:** P0 (bloquea todo lo demás)

---

## Plan de ejecución por slices (sugerido para dispatch)

| Slice | Título | Archivos | Rol | AC |
|---|---|---|---|---|
| 0.1 | Resolver conflicto de merge en service_test.go | `apps/api/internal/application/running/service_test.go` | dev-backend | AC-0.1 |
| 0.2 | Ajustar callers de NewService a 2 argumentos | `apps/api/internal/integration/running/http_e2e_test.go`, tests de handlers | dev-backend | AC-0.2 |
| 0.3 | Ejecutar build/vet/test y archivar baseline | `apps/api/` | dev-backend | AC-0.3 |
| 0.4 | Documentar gate CI local | `docs/plans/closeout-plan-2026-11-02.md` | dev-backend | AC-0.4 |
