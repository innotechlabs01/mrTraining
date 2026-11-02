# Auditoría de Dependencias Multi-Tenant — MR Training
**Fecha:** 2 de noviembre de 2026
**Modo:** READ-ONLY. No se crearon tablas, columnas, migraciones ni se ejecutó DDL/DML.
**Estado del proyecto:** A1 aprobado según pruebas reportadas · A2 bloqueado por ausencia de fuente de organización · Migraciones NO autorizadas

---

## 1. Objetivo

Determinar si el esquema actual dispone de alguna relación persistente entre usuarios, coaches y organizaciones que permita implementar A2 (TenantContext + resolución de organización) sin modificar el esquema.

**Pregunta central:** ¿Existe una estructura reutilizable que identifique la organización propietaria de cada usuario y sus datos?

---

## 2. CONCLUSIÓN: ESCENARIO C

> **No existe ninguna estructura multi-tenant en el esquema de MR Training.**
> La unidad de propiedad de los datos es **el coach**, no una organización.
> La única estructura de membresía con roles es `ally_members`, y pertenece exclusivamente al módulo comercial de Alianzas — no es reutilizable para tenancy sin mezclar conceptos comerciales con aislamiento de datos.

Se requiere esquema mínimo nuevo (`organizations` + `user_organizations`) antes de implementar A2. **Este informe solo lo propone; no lo ejecuta.**

---

## 3. Metodología y Fuentes

| Fuente | Qué se inspeccionó | Resultado |
|--------|--------------------|-----------|
| `migration-secure/turso-schema.sql` | Esquema de producción completo | 106 tablas |
| `apps/api/migrations/` (31 archivos) | Todas las migraciones SQLite | 0 referencias a organización |
| `apps/api/migrations/postgres/` (23 archivos) | Todas las migraciones PostgreSQL | 0 referencias a organización |
| `apps/api/internal/` (modelos, repos, servicios) | Identidad y propiedad | Ver §4.2, §4.3 |
| `apps/api/internal/middleware/auth.go` | Autenticación y rol | Ver §4.4 |
| `docs/04-database-design.md`, `apps/rules/04-database-design.md` | Diseño documentado | Modelo objetivo diverge del real |
| `docs/audits/mr-training-commercial-audit.md` | Decisiones previas | Super Admin vía Clerk Organizations |

---

## 4. Hechos Comprobados (Evidencia)

### 4.1 Inventario de estructuras candidatas — TODAS AUSENTES

Búsqueda de `organization`, `tenant`, `org_id`, `academies`, `teams`, `gyms`, `branches` sobre las 106 tablas de producción y las 54 migraciones:

| Estructura | Existe | Evidencia |
|------------|--------|-----------|
| Tabla `organizations` | ❌ NO | 0 coincidencias en esquema y migraciones |
| Tabla `academies` | ❌ NO | Existe solo en `docs/04-database-design.md` (diseño objetivo, nunca implementado) |
| Tabla `teams` | ❌ NO | 0 coincidencias |
| Columna `organization_id` en cualquier tabla | ❌ NO | 0 coincidencias en migraciones y esquema |
| Columna `tenant_id` | ❌ NO | 0 coincidencias |
| Columna `org_id` | ❌ NO | 0 coincidencias |

**Nota crítica:** `docs/04-database-design.md` (líneas 403-493) documenta un modelo completo con `organizations`, `users.organization_id`, `user_roles (user_id, organization_id, role)`, `coaches.organization_id`. **Este diseño NUNCA fue implementado.** El esquema real diverge completamente del documento de diseño.

### 4.2 Identidad: Clerk → users → coaches (1:1 por ID)

**Archivo:** `apps/api/internal/infrastructure/user/provision.go`

```go
// EnsureUser: users.id = Clerk user ID (JWT subject)
INSERT INTO users (id, email, name, avatar_url, role, ...)
VALUES ($1, ...)  -- $1 = userID de Clerk

// EnsureCoach: coaches.id = EL MISMO Clerk user ID
INSERT INTO coaches (id, email, name, coach_code, ...)
VALUES ($5, ...)  -- $5 = userID de Clerk
```

**Archivo:** `apps/api/internal/application/user/service.go` (líneas 42-81)
- `GetCurrentUser(ctx, userID, fallbackRole)` recibe el subject del JWT.
- `users.id` = `coaches.id` = `athlete_profiles.id` = Clerk user ID.
- Auto-provisioning: si falta la fila, se crea desde Clerk con el rol del JWT.

**Consecuencia:** La identidad interna NO requiere mapeo adicional. Un usuario es exactamente una de: coach, atleta o usuario base. El ID de Clerk ya es la clave primaria en las tres tablas.

### 4.3 Propiedad de datos: patrón `coach_id` (el coach ES el tenant de facto)

72 apariciones de `coach_id`; 24+ tablas lo usan como propietario:

| Tabla | Propietario | Tipo de relación |
|-------|-------------|------------------|
| `coach_athletes` | `coach_id NOT NULL` | Atleta pertenece a UN coach |
| `coach_athlete_links` | PK (coach_id, athlete_id) | Soporta atleta con VARIOS coaches |
| `athlete_memberships` | `coach_id NOT NULL` | Membresía comercial atleta↔coach |
| `plans` | `coach_id NOT NULL` | Plan de precios del coach |
| `events` | `coach_id NOT NULL` | Eventos del coach |
| `programs` | `coach_id NOT NULL` | Programas del coach |
| `workout_templates` | `coach_id` | Plantillas del coach |
| `coach_settlements`, `settlement_items` | `coach_id` | Liquidaciones |
| `commission_entries` | `coach_id NOT NULL` | Comisiones |
| `coach_payment_records` | `coach_id` | Pagos |

**Consecuencia:** Cada fila de datos de negocio ya tiene un propietario individual (`coach_id`). Hoy el aislamiento se hace en la capa de aplicación filtrando por `coach_id` (verificado en repositorios, p.ej. `infrastructure/coach/repository.go`, `infrastructure/user/repository.go`). No hay capa por encima del coach.

### 4.4 Roles: ubicación y alcance real

| Ubicación | Valores | Alcance | Fuente |
|-----------|---------|---------|--------|
| `users.role` | `athlete` \| `coach` | **GLOBAL** (uno por usuario) | Esquema línea 1341 + provision.go |
| `ally_members.role` | `owner` \| `staff` | **SOLO módulo Alianzas** | Esquema línea 57-62 |
| Clerk `ActiveOrganizationRole` | rol de organización Clerk | Usado en middleware como rol efectivo | `middleware/auth.go:133-135` |
| Clerk `publicMetadata.role` | rol custom | Fallback del middleware | `middleware/auth.go:137-145` |

**Archivo:** `apps/api/internal/middleware/auth.go` — prioridad del rol:
1. `claims.ActiveOrganizationRole` (organización activa de Clerk, si existe)
2. `publicMetadata.role` en el JWT
3. `fetchUserRole()` vía Clerk Backend API (con caché 5 min)
4. Default: `"athlete"`

**Observación:** el middleware ya consume el rol de una organización activa de Clerk cuando el JWT la trae, pero **esa pertenencia no está persistida en ninguna tabla de la base de datos**. Si Clerk es la fuente, la validación de pertenencia vive fuera del control de la API y no es auditable desde PostgreSQL.

### 4.5 Estructura más cercana a organización: Alianzas (NO reutilizable)

```sql
-- allies: entidad comercial (dueño individual)
CREATE TABLE allies (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,          -- un usuario dueño
  legal_name TEXT NOT NULL,
  commercial_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','active','suspended'))
);

-- ally_members: membresía usuario→ally CON roles (la única del sistema)
CREATE TABLE ally_members (
  ally_id TEXT NOT NULL REFERENCES allies(id),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  UNIQUE (ally_id, user_id)
);

-- coach_ally_relationships: relación comercial coach↔ally
CREATE TABLE coach_ally_relationships (
  coach_id TEXT NOT NULL,
  ally_id TEXT NOT NULL REFERENCES allies(id),
  status TEXT CHECK (status IN ('invited','active','declined','suspended')),
  UNIQUE (coach_id, ally_id)
);
```

**Por qué NO es una estructura de tenancy reutilizable:**
1. Un `ally` es un socio comercial (gimnasio, nutricionista), no un tenant de datos.
2. Los datos de negocio (atletas, planes, workouts) NO cuelgan de `ally_id`; cuelgan de `coach_id`.
3. `ally_members.role` ('owner'|'staff') no cubre los roles de aplicación (coach, atleta, super_admin).
4. Reutilizar Alianzas como tenancy mezclaría la relación comercial (quién comparte ingresos) con la propiedad de datos (de quién son los registros) — exactamente la confusión que la revisión de arquitectura prohibió.

### 4.6 Usuarios multi-organización: sin representación

- Un atleta puede tener varios coaches (`coach_athlete_links`, PK compuesta).
- Un coach puede colaborar con varios allies (`coach_ally_relationships`).
- **Ninguna de esas relaciones representa pertenencia a una organización con rol propio.** Son relaciones de servicio o comerciales.

### 4.7 Decisión previa documentada (Super Admin)

`docs/audits/mr-training-commercial-audit.md` §Q: *"Implementar con Clerk Organization + rol 'super_admin'"*.

**Implicancia:** la decisión previa apunta a Clerk Organizations como fuente de pertenencia/rol para Super Admin. Eso es compatible con el esquema mínimo propuesto, pero exige que la API valide contra Clerk y persista un espejo auditable (`user_organizations`) o confíe ciegamente en el JWT — riesgo ya señalado en revisiones anteriores (el rol no debe provenir de un valor manipulable por el cliente sin verificación backend).

---

## 5. Respuestas a las preguntas obligatorias

| # | Pregunta | Respuesta | Tipo |
|---|----------|-----------|------|
| 1 | ¿Existe tabla que relacione usuarios con organizaciones (aunque tenga otro nombre)? | **No.** `ally_members` es la única membresía con roles y es exclusiva de Alianzas | HECHO |
| 2 | ¿Relación usuario-coach que resuelva el propietario de los datos? | Sí: `coach_athletes.coach_id` y `coach_athlete_links`. El propietario es siempre un `coach_id` | HECHO |
| 3 | ¿Cómo se representan usuarios con múltiples relaciones? | Atleta con N coaches: `coach_athlete_links`. Coach con N allies: `coach_ally_relationships`. Sin concepto de organización | HECHO |
| 4 | ¿Dónde se almacena el rol efectivo? | `users.role` (global: athlete\|coach) + rol de organización Clerk en el JWT (no persistido). Roles de ally en `ally_members.role` | HECHO |
| 5 | ¿Qué tablas pertenecen a un coach y cuáles a una organización? | Todas las tablas de negocio pertenecen a un COACH (24+ con `coach_id`). Ninguna pertenece a una organización | HECHO |
| 6 | ¿Qué entidades requieren aislamiento por organización? | En el modelo actual, NINGUNA lo necesita: cada coach es una unidad de aislamiento completa. La organización solo se justifica si MR Training quiere agrupar coaches bajo un mismo tenant (academia/marca) | INFERENCIA |
| 7 | ¿Puede resolverse A2 con estructuras existentes? | **No.** No hay fuente persistente de organización. Única alternativa sin migraciones: usar Clerk Organizations como única fuente (ver §7, Opción 1) con sus límites | HECHO + INFERENCIA |
| 8 | Si no es posible, ¿cuál es el esquema mínimo que falta? | `organizations` + `user_organizations` + estrategia de propagación a tablas de datos (ver §6) | RECOMENDACIÓN |

---

## 6. Propuesta de Esquema Mínimo (SOLO PROPUESTA — NO EJECUTAR)

### 6.1 Tablas nuevas

```sql
-- Organizations: cada tenant (academia / marca / coach independiente)
CREATE TABLE organizations (
    id         TEXT PRIMARY KEY,              -- o UUID
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Organizations: pertenencia + ROL EFECTIVO por organización
-- (el rol vive en la RELACIÓN, no en el usuario global)
CREATE TABLE user_organizations (
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    user_id         TEXT NOT NULL,             -- = Clerk user ID = users.id
    role            TEXT NOT NULL
                    CHECK (role IN ('owner','coach','staff','athlete','super_admin')),
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','invited','suspended')),
    granted_by      TEXT,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
```

### 6.2 Estrategia de propagación a tablas de datos (decisión pendiente)

**Opción A — columna denormalizada `organization_id` en tablas de negocio** (lo que exige RLS eficiente):
- Pro: políticas RLS de una sola tabla, sin joins ni riesgo de recursión.
- Con: backfill masivo (24+ tablas) y doble fuente de verdad si el coach cambia de organización.

**Opción B — resolución vía join `coach_id → coaches → user_organizations`:**
- Pro: sin tocar tablas existentes.
- Con: las políticas RLS consultan `user_organizations` (tabla protegida) → riesgo de recursión RLS que la revisión B2 ya exigió analizar; peor rendimiento.

**Recomendación preliminar:** Opción A para las tablas de aislamiento crítico (atletas, membresías, comisiones, liquidaciones), con backfill transaccional. La decisión final pertenece a la aprobación de migraciones.

### 6.3 Backfill propuesto (sin ejecutar)

| Paso | Operación | Impacto |
|------|-----------|---------|
| 1 | Crear 1 organización por cada coach activo en `coaches` | N organizaciones = N coaches |
| 2 | Insertar `user_organizations (org, coach_id, 'owner')` para cada coach | El coach es dueño de su organización |
| 3 | Para cada atleta en `coach_athletes`: insertar pertenencia a la organización de su coach | ⚠️ Atletas con VARIOS coaches → N filas en `user_organizations` (N:M, soportado por la PK compuesta) |
| 4 | Super Admin: fila aparte con rol `super_admin` por decisión operativa | Pendiente definir quién |

### 6.4 Impacto sobre datos existentes y riesgos de compatibilidad

| Riesgo | Detalle | Mitigación |
|--------|---------|------------|
| Atletas multi-coach | Un atleta con 2 coaches pertenece a 2 organizaciones. El TenantContext debe resolver la organización ACTIVA (header `X-Organization-ID` + validación `userBelongsToOrg`) | PK compuesta ya lo soporta; middleware valida pertenencia |
| `users.role` vs rol por organización | Dos fuentes de rol (global y por-org) pueden divergir | Definir precedencia explícita: rol por organización manda en datos de esa organización; `users.role` queda como compatibilidad temporal |
| Clerk Organizations ya en uso | El middleware ya lee `ActiveOrganizationRole`; debe validarse contra `user_organizations` persistido (espejo) o verificarse con la API de Clerk en cada cambio de organización | Validación backend obligatoria (criterio A2) |
| Datos huérfanos | Filas con `coach_id` inexistente romperían el backfill | Auditoría previa: `SELECT DISTINCT coach_id` vs `coaches` |
| Doble verdad organizacional | Clerk y DB pueden desincronizarse | Definir fuente de verdad única (recomendado: DB) y sincronizar desde Clerk vía webhook |

---

## 7. Dependencias para implementar TenantContext (A2)

Con el esquema mínimo aprobado, A2 requiere:

1. **Repositorio `OrganizationResolver`**: `resolvePrimaryOrg(ctx, userID)` (consulta `user_organizations WHERE user_id = $1 AND status = 'active'`; si hay varias, exige `X-Organization-ID` explícito).
2. **Validador**: `userBelongsToOrg(ctx, userID, orgID)` → 403 si no pertenece o está suspendido.
3. **Rol efectivo**: leído de `user_organizations.role` (backend), nunca del frontend.
4. **Integración Fiber**: `TenantContext()` middleware después de `RequireAuth()`, seteando `c.Locals` (usuario, organización, rol).
5. **Integración UnitOfWork**: handlers abren `uow.Begin(ctx, userID, orgID, role)` y pasan `uow.Tx()` a los repositorios (contrato A1 ya aprobado).
6. **Super Admin / service accounts**: identidad de servicio con contexto propio auditado, sin pasar por pertenencia de usuario.

---

## 8. Separación hechos / inferencias / recomendaciones

**HECHOS (verificados en código/esquema):**
- 0 estructuras de organización en esquema y migraciones.
- `users.id` = `coaches.id` = `athlete_profiles.id` = Clerk user ID.
- Propiedad de datos: `coach_id` en 24+ tablas; aislamiento actual por filtro de aplicación.
- `ally_members` es la única membresía con roles y es exclusiva de Alianzas.
- El diseño de `docs/04-database-design.md` (organizations + user_roles) nunca se implementó.
- El middleware ya consume rol de organización Clerk cuando el JWT lo trae, sin espejo en DB.

**INFERENCIAS:**
- El coach es hoy el tenant de facto; la organización es una capa nueva, no un renombrado.
- Los atletas multi-coach implicarán pertenencia N:M a organizaciones.
- Usar Alianzas como tenancy rompería la separación comercial/propiedad exigida por la revisión de arquitectura.

**RECOMENDACIONES (requieren autorización):**
- Esquema mínimo: `organizations` + `user_organizations` (§6.1).
- Propagación: columna `organization_id` en tablas críticas (§6.2, Opción A), decisión final pendiente.
- Backfill 1 org por coach + pertenencias derivadas (§6.3).
- Fuente de verdad de pertenencia: DB espejo de Clerk, validada en backend.

---

## 9. DECISIÓN REGISTRADA — Coach como Tenant (2 de noviembre de 2026)

**Decidido por el propietario del producto tras revisar este informe:**

| Decisión | Resultado |
|----------|-----------|
| Tenant actual | **Coach** (`coach_id` es la frontera de aislamiento) |
| Tabla `organizations` | **NO crear** |
| Tabla `user_organizations` | **NO crear** |
| Columna `organization_id` | **NO agregar** |
| Contexto PostgreSQL | `app.current_user_id` + `app.current_coach_id` + `app.user_role` |
| A1 | ✅ Aprobado según pruebas reportadas (lifecycle UoW; la variable de contexto cambia de orgID a coachID en A2) |
| A2 | Rediseñar e implementar (ver §9.1) |
| B1/B2/C1/C2 | Continúan bloqueados hasta A2 validado |
| Migraciones | ❌ NO autorizadas |
| Escenario futuro (academias) | Diferido. Requerirá nueva relación de propiedad y revisión de políticas RLS — no trivial |

### 9.1 Resolución de contexto por tipo de usuario

| Usuario | Resolución de `current_coach_id` | Validación |
|---------|----------------------------------|------------|
| Coach autenticado | `userID` → verificar fila en `coaches` con `is_active = 1` | No equipar ciegamente; coach desactivado → 403 |
| Atleta autenticado | Por operación: `X-Coach-ID` header o recurso solicitado | Validar relación en `coach_athlete_links WHERE athlete_id = $1 AND coach_id = $2 AND status = 'active'`; sin relación → 403. NUNCA asignar coach permanente |
| Super Admin | Acceso administrativo explícito y auditado | No debe constituir bypass RLS accidental |
| Service account (webhook) | Contexto de servicio propio, auditado | Sin usuario interactivo |

### 9.2 Implicancia para B2 (RLS)

Las políticas necesitarán dos patrones:
- Tablas propiedad de coach: `coach_id = current_setting('app.current_coach_id')`
- Tablas del atleta (p.ej. `athlete_profiles`): `user_id = current_setting('app.current_user_id')`

Ambas variables (`current_user_id` y `current_coach_id`) son necesarias en el contexto transaccional.

---

## 10. Estado y Próximo Paso

| Elemento | Estado |
|----------|--------|
| A1 — UnitOfWork | ✅ Aprobado según pruebas reportadas |
| A2 — TenantContext | ⛔ BLOQUEADO: requiere fuente persistente de organización (Escenario C) |
| Migraciones | ❌ NO AUTORIZADAS — este informe no crea ni ejecuta nada |
| B1/B2/C1/C2 | ⛔ BLOQUEADOS (dependen de A2) |

**Decisión requerida del propietario del producto:**
1. ¿MR Training necesita organizaciones reales (varios coaches bajo un tenant), o el aislamiento por coach es suficiente para el modelo de negocio actual?
2. Si la respuesta es sí: autorizar el diseño detallado y las migraciones de `organizations` + `user_organizations` como entrega separada.
3. Si la respuesta es no: A2 se redefine como "contexto por coach" (`app.current_coach_id`) reutilizando `coach_id` existente, sin migraciones — variante que debe validarse contra los criterios de RLS de B2.

*Este informe no autoriza ni ejecuta cambios. Espera decisión explícita.*
