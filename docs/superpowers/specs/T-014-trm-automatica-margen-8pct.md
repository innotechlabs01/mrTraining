# T-014: TRM automática con margen del 8% y actualización cada 4 horas — Design Spec

> Feature: Tasa Representativa del Mercado (TRM) obtenida automáticamente del Banco de la República (datos.gov.co) cada 4 horas, almacenada en DB con un margen del +8%, expuesta como campo no editable en el admin de planes para conversión USD→COP.
> Estado: por iniciar.

---

## 1. Problema

El admin de planes permite crear planes en USD o COP. Cuando un plan está en USD, el coach necesita saber cuánto vale en COP (para facturación local). Actualmente el frontend pide al usuario que escriba manualmente una TRM, lo cual es propenso a errores y se queda desactualizado. Se necesita que el sistema obtenga la TRM oficial automáticamente, le aplique un margen del 8%, la almacene en BD y la exponga como campo de solo lectura.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|-----|----------|----------------|
| Super admin | Gestiona la plataforma | Ver la TRM actualizada automáticamente con +8% de margen, campo no editable, al crear/editar planes en USD |
| Atleta/Coach | Compra planes | Ver el precio convertido a COP usando la TRM oficial + margen |

### Acceptance Criteria

- [ ] **AC-1:** El API Go consulta `https://www.datos.gov.co/resource/32sa-8pi3.json` cada 4 horas y almacena la TRM en `platform_settings` (clave `trm.current`) con el valor +8% aplicado.
- [ ] **AC-2:** Existe endpoint `GET /api/v1/admin/settings/trm` (o similar) que devuelve la TRM con margen del 8%, vigencia y fecha de última actualización. Protegido por super admin.
- [ ] **AC-3:** El campo TRM en el modal de crear/editar plan (admin de planes) es de solo lectura, se muestra automáticamente, y se usa para convertir USD→COP al guardar.
- [ ] **AC-4:** Si la consulta al Banco de la República falla, el sistema conserva el último valor conocido y no bloquea el guardado de planes.
- [ ] **AC-5:** `go build ./...`, `go vet ./...`, `go test ./...` pasan sin errores.
- [ ] **AC-6:** `pnpm build` de web pasa, `pnpm test` pasa.

---

## 3. Criterios UX (obligatorios)

- **Campo no editable:** La TRM mostrada en el modal es de solo lectura (disabled/readonly), con indicador visual de "actualizado automáticamente cada 4 horas".
- **Indicador de fecha:** Mostrar "Última actualización: <fecha>" junto al valor.
- **Error silencioso:** Si no se pudo obtener la TRM, mostrar el último valor conocido con advertencia suave, no bloquear el flujo.
- **Conversión visible:** Mostrar el monto en COP calculado (precio USD × TRM con 8% de margen) en tiempo real mientras el usuario escribe el precio en USD.

---

## 4. Flujo de usuario

```
Super admin abre /admin/plans
  → Crea/edita plan en USD
  → El campo TRM se autocompleta con el valor oficial + 8% (solo lectura)
  → Mientras escribe el precio en USD, se muestra el equivalente en COP
  → Guarda el plan con precio en USD y TRM aplicada
```

---

## 5. Diseño (la solución)

### Backend (Go API)

**Existencia ya verificada:**
- `internal/application/trm/service.go` — Servicio que consulta `datos.gov.co` (datosGovURL) con caché en memoria de 1 hora. Ya existe.
- `migrations/postgres/420_platform_settings.sql` — Tabla `platform_settings(key TEXT PRIMARY KEY, value JSONB, updated_at)`. Ya existe.
- `internal/application/trm/` ya tiene `Service` con `GetCurrent()`.

**Cambios necesarios:**

1. **Migración nueva** (ej. `422_trm_setting.sql` o usar `platform_settings` existente): No se necesita nueva tabla; se usa `platform_settings` con clave `trm.current`. El valor JSONB contendrá: `{ value: <trm_con_margen>, vigencia_desde: <fecha>, fetched_at: <timestamp>, margin_pct: 8 }`.

2. **Modificar `internal/application/trm/service.go`:**
   - Inyectar `*sql.DB` (o un repository) para persistir en `platform_settings`.
   - Cambiar caché de 1 hora a **4 horas**.
   - Al obtener la TRM, aplicar **margen del 8%**: `value * 1.08`.
   - Guardar en `platform_settings` con clave `trm.current`.
   - Agregar método `GetWithMargin()` que devuelva el valor con margen ya aplicado (o el margen se aplica al guardar y `GetCurrent` devuelve ya con margen).

3. **Worker/tarea periódica:** Un goroutine iniciado en `cmd/api/main.go` (o en el wire de dependencias) que ejecute `GetCurrent()` cada 4 horas. Similar al patrón de `internal/middleware/ratelimit.go` (ticker) o `internal/application/running/outbox/worker.go`.

4. **Endpoint:** `GET /api/v1/admin/settings/trm` en `AdminHandler` (ya existe `RegisterAdminRoutes` con `/settings`). Devuelve la TRM con margen, vigencia y fecha de actualización. Protegido por `RequirePlatformSuperAdmin`.

### Frontend (Next.js web)

**Archivo:** `apps/web/src/app/(app)/admin/plans/page.tsx` (ya modificado en esta sesión)

**Cambios:**
- El campo TRM es `disabled` (solo lectura), no editable por el usuario.
- Se obtiene al cargar la página mediante `GET /api/v1/admin/settings/trm`.
- Se muestra el valor con formato de moneda COP.
- Mientras el usuario escribe el precio en USD, se muestra el equivalente en COP calculado (precio × TRM con margen).
- Indicador de "Última actualización: <fecha>" junto al campo.

---

## 6. API (endpoints)

| Método | Path | Auth | Estado |
|--------|------|------|--------|
| GET | /api/v1/admin/settings/trm | Super admin | Nuevo |
| GET | /api/v1/admin/settings | Super admin | Ya existe (GetSettings) |

---

## 7. Fuera de scope

- Crear una tabla dedicada para TRM (se usa `platform_settings` existente).
- Webhooks o notificaciones cuando la TRM cambie.
- Cambiar la moneda de planes existentes (solo aplica a nuevos planes o ediciones).

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| datos.gov.co no disponible | Medio | Conservar último valor en `platform_settings`; falla silenciosa. |
| El margen del 8% es una decisión de negocio | Bajo | Se configura como constante en el servicio; fácil de cambiar. |
| Doble caché (memoria + DB) | Bajo | La caché en memoria es para velocidad de respuesta; DB es para persistencia entre reinicios. |

---

## 9. Referencias

- `apps/api/internal/application/trm/service.go` — Servicio TRM existente.
- `apps/api/migrations/postgres/420_platform_settings.sql` — Tabla platform_settings.
- `apps/api/migrations/postgres/202_coaching_schema.sql` — Tabla plans (línea 176).
- `apps/api/internal/middleware/ratelimit.go` — Patrón de ticker periódico.
- `apps/api/internal/application/running/outbox/worker.go` — Patrón de worker con ticker.
- `apps/rules/08-api-specification.md` — Contrato de API.
- `apps/rules/11-security.md` — Super admin, fail-closed.

---

## Verificación

```
cd apps/api && go build ./... && go vet ./... && go test ./...
cd apps/web && npx tsc --noEmit && pnpm lint && pnpm test && pnpm build
```
