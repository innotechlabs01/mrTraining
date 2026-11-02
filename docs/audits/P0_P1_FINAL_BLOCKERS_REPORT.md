# Bloqueo Técnico Final P0/P1 — MR Training
**Fecha:** 2 de noviembre de 2026  
**Estado:** ❌ BLOQUEADO — NO AUTORIZADAS LAS MIGRACIONES  

> **DECISIÓN OFICIAL:** No existe autorización para ejecutar migraciones en ningún entorno.

La autorización solo podrá reconsiderarse cuando exista evidencia reproducible de aislamiento multi-tenant funcional y transaccional en PostgreSQL local.

Los defectos identificados pueden provocar accesos indebidos entre coaches y fallos de implementación. No pueden aplazarse hasta QA o producción.

---

## 📋 RESUMEN DE PROBLEMAS CONFIRMADOS

| # | Problema | Ubicación | Estado | Prioridad |
|---|----------|-----------|--------|-----------|
| 1 | ❌ Middleware SET LOCAL no existe | `apps/api/internal/middleware/auth.go` | CONFIRMADO | P0 |
| 2 | ❌ Contexto RLS sin transacción | `apps/api/internal/infrastructure/database/db.go` | CONFIRMADO | P0 |
| 3 | ❌ Rollback políticas RLS sin documentar | Ninguno | CONFIRMADO | P0 |
| 4 | ❌ SQL P0 incompatible PostgreSQL | Propuestas | CONFIRMADO | P0 |
| 5 | ❌ Middleware TenantContext no existe | Ninguno | CONFIRMADO | P0 |
| 6 | ✅ Exemptions independiente membresías | Diseño | VIABLE | P1 |

---

## 🔍 ANÁLISIS TÉCNICO DETALLADO

### 1. Contexto Transaccional RLS — CRÍTICO

#### Evidencia Real

**Archivo:** `apps/api/internal/middleware/auth.go`

```go
// No existe SET LOCAL app.current_user_id
// Solo guarda en c.Locals():
func RequireAuth() fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := middleware.GetUserID(c)  // Extrae de Clerk JWT
        // ... verificación ...
        c.Locals("userID", userID)  // ❌ NO hay SET LOCAL PostgreSQL
        c.Locals("userRole", role)
        return c.Next()
    }
}
```

**Archivo:** `apps/api/internal/infrastructure/database/db.go`

```go
func NewConnectionPool(dsn string) (*Connection, error) {
    pool, err := pgxpool.New(context.Background(), dsn)
    // Configura:
    // - MaxOpenConns(25)
    // - MaxIdleConns(5)
    // - ConnMaxLifetime(30 min)
    // - ConnMaxIdleTime(5 min)
    // ❌ NO establece app.current_user_id
    // ❌ NO establece app.current_organization_id
    return &Connection{pool: pool}, nil
}
```

#### Problema Confirmado

El contexto `SET LOCAL app.current_user_id = 'xxx'` **nunca se ejecuta**. Las consultas protegidas por RLS fallarán o expondrán datos incorrectos.

#### Solución Requerida

Crear una capa transaccional compartida:

```go
// database/uow.go (nuevo archivo)
type UnitOfWork struct {
    db       *sql.DB
    tx       *sql.Tx
    conn     *sql.Conn
}

func (uow *UnitOfWork) Begin(ctx context.Context, userID, orgID, role string) error {
    // Get dedicated connection
    conn, err := uow.db.Conn(ctx)
    if err != nil {
        return err
    }
    uow.conn = conn

    // Begin transaction
    tx, err := conn.BeginTx(ctx, nil)
    if err != nil {
        conn.Close()
        return err
    }
    uow.tx = tx

    // Set RLS context
    _, err = tx.ExecContext(ctx,
        "SELECT set_config('app.current_user_id', $1, true), set_config('app.current_organization_id', $2, true), set_config('app.user_role', $3, true)",
        userID, orgID, role)
    if err != nil {
        tx.Rollback()
        conn.Close()
        return err
    }

    return nil
}

func (uow *UnitOfWork) Commit(ctx context.Context) error {
    err := uow.tx.Commit()
    uow.conn.Close()
    return err
}

func (uow *UnitOfWork) Rollback(ctx context.Context) error {
    err := uow.tx.Rollback()
    uow.conn.Close()
    return err
}

func (uow *UnitOfWork) Tx() *sql.Tx { return uow.tx }
```

---

### 2. Organización vs Usuario — BLOQUE TÉCNICO ADICIONAL

#### Hallazgo

El diseño documentado (`docs/05-backend-architecture.md` líneas 1069-1091) contempla un middleware `TenantContext()`:

```go
func TenantContext() fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := c.Locals("user_id").(string)
        orgID := c.Get("X-Organization-ID")
        
        if orgID == "" {
            orgID = resolvePrimaryOrg(c.Context(), userID)
        }
        
        if !userBelongsToOrg(c.Context(), userID, orgID) {
            return apperror.ErrForbidden("you do not belong to this organization")
        }
        
        c.Locals("organization_id", orgID)
        return c.Next()
    }
}
```

**Este middleware NO EXISTE en el código actual.**

#### Consecuencia para A2

El UnitOfWork puede establecer `app.current_organization_id`, pero **no hay forma de obtenerla** del usuario autenticado de forma segura.

#### Funciones Requeridas

```go
// Necesario para A2:
func resolvePrimaryOrg(ctx context.Context, userID string) (string, error) {
    // Lookup en tabla users.organization_id
}

func userBelongsToOrg(ctx context.Context, userID, orgID string) bool {
    // Verificar que usuario pertenece a la organización
}
```

---

### 3. Workers y Cola Pago — CORRECCIÓN REQUERIDA

Los archivos creados en el worktree de auditoría tienen varios errores críticos:

1. **Pool contamination:** El worker puede reutilizar conexiones con contexto anterior
2. **claimToken missing:** Sin identificador único de reclamación, workers antiguos pueden finalizar trabajos
3. **now() en índices:** PostgreSQL no permite funciones no inmutables en predicados de índices parciales
4. **attempt counter incorrecto:** `attempt = attempt + 1` registra el primer intento como 2

---

### 4. Políticas RLS — CORRECCIÓN REQUERIDA

```sql
-- ❌ ERROR: FOR INSERT, UPDATE, DELETE no es válido en PostgreSQL
CREATE POLICY "policy" ON table FOR INSERT, UPDATE, DELETE ...

-- ✅ CORRECTO:
CREATE POLICY "policy_read" ON table FOR SELECT ...
CREATE POLICY "policy_write" ON table FOR INSERT, UPDATE, DELETE ...
```

---

## 📋 CRITERIOS DE ACEPTACIÓN PARA AUTORIZAR P0/P1

### A1 — UnitOfWork Transaccional

- [ ] `database/uow.go` implementado con `Begin()`, `Commit()`, `Rollback()`
- [ ] Liberación correcta de `sql.Conn` y `sql.Tx` en todos los caminos
- [ ] Pruebas unitarias que cubran errores y casos límite
- [ ] Repositorios utilizan `sql.Tx` compartido, no `db.QueryContext()`

### A2 — Contexto Multi-Tenant (REDISEÑADO: Coach como Tenant)

> **Decisión registrada (2 nov 2026):** el tenant actual es el **coach**. NO se crean `organizations` ni `user_organizations`. El contexto PostgreSQL es `app.current_user_id` + `app.current_coach_id` + `app.user_role`. Detalle completo: `docs/audits/MULTI_TENANT_DEPENDENCY_AUDIT.md` §9.

- [ ] `UnitOfWork.Begin(ctx, userID, coachID, role)` — cambio de variable orgID → coachID
- [ ] Middleware `TenantContext()` implementado
- [ ] Coach autenticado: resolver `current_coach_id` validando `coaches.is_active = 1` (no equipar ciegamente)
- [ ] Atleta autenticado: resolver coach **por operación** + validar `coach_athlete_links` (sin relación activa → 403)
- [ ] Rol efectivo validado en backend (nunca del cliente)
- [ ] Integración con repositorios usando el mismo `sql.Tx`
- [ ] Pruebas de aislamiento transaccional (aislamiento efectivo entre coaches queda demostrado en B2 + C2)

### B1 — Worker Duradero

- [ ] `claimToken` único por adquisición
- [ ] `worker_id` y `locked_until` verificados en `Complete()` y `Fail()`
- [ ] Recuperación de leases vencidos implementada
- [ ] Backoff exponencial para reintentos
- [ ] Estado terminal `dead` para agotar intentos

### B2 — Políticas RLS

- [ ] SQL PostgreSQL válido sin sintaxis inválida
- [ ] `WITH CHECK` verificando propiedad de filas
- [ ] Validación de `coach_id` y `organization_id`
- [ ] Rollback documentado sin deshabilitar RLS

---

## 🎯 ESTADO ACTUAL

| Entrega | Estado | Evidencia Requerida |
|---------|--------|---------------------|
| **A1** UnitOfWork | ✅ Implementado | 22 pruebas unitarias + 6 de pool (38 pruebas en total con middleware) |
| **A2** Contexto Multi-tenant (Coach) | ✅ Implementado | Middleware + 10 pruebas (coach/atleta/independiente/errores) |
| **B1** Worker | Bloqueado hasta A1/A2 | Implementación + pruebas |
| **B2** RLS | Bloqueado hasta A1/A2 | SQL validado + pruebas |
| **C1** Índices | Bloqueado hasta B2 | SQL PostgreSQL válido |
| **C2** Pruebas Locales | Bloqueado hasta B2 | Evidencia reproducible (pendiente: PostgreSQL local no disponible) |

---

## ❌ VEREDICTO FINAL

**BLOQUEADO — NO AUTORIZO MIGRACIONES.**

### Estado de entregas

| Entrega | Estado | Evidencia |
|---------|--------|-----------|
| **A1** UnitOfWork | ✅ Implementado | 22 pruebas + 6 pool |
| **A2** Contexto Multi-tenant | ✅ Implementado | 10 pruebas middleware |
| **B1** Worker | ⛔ Bloqueado | Depende de A1/A2 |
| **B2** RLS | ⛔ Bloqueado | Depende de A1/A2 |
| **C1** Índices | ⛔ Bloqueado | Depende de B2 |
| **C2** Pruebas Locales | ⛔ Bloqueado | PostgreSQL local no disponible |

### Razones del bloqueo continuo

Las migraciones siguen sin autorizarse porque:

1. **RLS no implementado** — Las políticas de seguridad no existen en el código (B2 pendiente).
2. **Worker durable no implementado** — La cola de pagos no existe (B1 pendiente).
3. **Pruebas de aislamiento contra base real no ejecutadas** — PostgreSQL local no disponible (C2 pendiente).

**A1 y A2 están implementados y verificados con pruebas unitarias, pero sin PostgreSQL real no se puede confirmar el aislamiento transaccional efectivo.**

**NO se autoriza ejecutar migraciones hasta validar B1, B2 y C2 en PostgreSQL local.**