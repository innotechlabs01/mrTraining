# Fase 3 — Mobile atleta — Design Spec

> **Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. Planificación desglosada en slices listos para PR. No incluye código de implementación.**

---

## 1. Problema

El running estructurado del atleta deja pendiente: GPS en lote + offline queue (MMKV) + reintento idempotente; sync iniciado/completado con backend, audio cues y estado UI; pruebas Jest y TypeScript; y validación real en emulador/dispositivo (navegación, listas, ejecución, summary, membership gate). Fase 2 (real data + imágenes) es prerequisite: sin datos reales del backend, el móvil sigue mostrando mocks/cards blank.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| dev-react-native | React Native (apps/mobile) | GPS batch, offline queue, sync, audio cues, tests, validación real dispositivo |

### Acceptance Criteria

- [ ] **AC-3.1:** Given GPS en lote, When se envían puntos GPS por batch (cap 100, filtro accuracy >50m), Then backend recibe batch completo sin pérdida ni duplicados.
- [ ] **AC-3.2:** Given offline queue MMKV, When el dispositivo está sin conexión, Then las acciones se encolan localmente y se reenvían al recuperar conexión.
- [ ] **AC-3.3:** Given reintento idempotente, When se reenvía una acción ya procesada, Then el backend no duplica la operación (idempotency key).
- [ ] **AC-3.4:** Given sync iniciado/completado con backend, When el atleta ejecuta un workout, Then el UI refleja estado iniciado → ejecutando → completado con audio cues.
- [ ] **AC-3.5:** Given Jest + TSC, When `npm test` y `npx tsc --noEmit` en `apps/mobile`, Then todo verde (corregir failures).
- [ ] **AC-3.6:** Given validación real en emulador/dispositivo, When se prueba navegación, listas, ejecución, summary, membership gate, Then todos pasan en dispositivo real (no basta con que compile).

---

## 3. Criterios UX (obligatorios)

- **Loading:** skeleton o spinner contextual (nunca pantalla vacía).
- **Empty:** ilustración + copy + acción sugerida.
- **Error:** mensaje humano + retry.
- **Primary action:** una por pantalla.
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

```
Atleta abre app → membership gate (si no tiene plan → pantalla de membresía)
Atleta selecciona workout asignado → Empezar (POST /workouts/:id/session) → UI "iniciado"
GPS en lote se envía mientras corre → backend recibe puntos
Atleta termina → Completar → UI "completado" + audio cue + summary
Si sin conexión → acciones encoladas en MMKV → reenvío al volver online (idempotente)
```

Incluir: back navigation, estados de error en cada paso, offline si aplica.

---

## 5. Diseño (la solución)

### Slices de trabajo (PR-ready, en orden)

1. **Slice 3.1 — GPS en lote**: cliente móvil envía batch de GPS points (cap `maxGpsBatchPoints=100`, filtro accuracy >50m), endpoint backend correspondiente (Fase 2 provee sesión).
2. **Slice 3.2 — Offline queue MMKV**: cola local de acciones (workout start/complete, GPS) con persistencia MMKV; reenvío al recuperar conexión.
3. **Slice 3.3 — Reintento idempotente**: idempotency key por acción; backend deduplica (relacionado con Fase 1 Outbox `event_id`).
4. **Slice 3.4 — Sync estado UI + audio cues**: estados iniciado/ejecutando/completado sincronizados con backend; audio cues en transiciones.
5. **Slice 3.5 — Pruebas Jest + TSC**: `npm test`, `npx tsc --noEmit` en `apps/mobile`; corregir failures.
6. **Slice 3.6 — Validación real dispositivo**: emulador/dispositivo real; navegación, listas, ejecución, summary, membership gate.

### Estructura de rutas / screens

Rutas relevantes: `home` (Today), `WorkoutExecution`, `WorkoutDetail`, `Membership` (gate).

### Componentes

No se definen componentes nuevos aquí; se adaptan pantallas existentes para GPS batch, offline queue y sync.

### Types

No aplica a este plan (tipos ya definidos en Fase 2).

---

## 6. API (si aplica)

Consume contratos de Fase 2 (`{workout,exercises,session}`, GPS batch endpoint si existe). No define endpoints nuevos en esta fase.

| Método | Path | Purpose |
|---|---|---|
| — | — | — (consume contratos Fase 2) |

---

## 7. Fuera de scope (explícito)

- Rediseño visual de pantallas B/C (Fase 5).
- MediaPipe AI pipeline (bloqueado por native build, documentado en auditoría).
- Migraciones de base de datos (bloqueadas hasta Fase 1).

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Validación en dispositivo real no disponible | Alto | Si no hay emulador/dispositivo, marcar como BLOCKED (regla AGENTS.md); no dar por completo sin validación real. |
| GPS batch sin endpoint backend listo | Medio | Fase 2 es prerequisite; coordinar endpoint antes de Slice 3.1. |
| MMKV queue sin limpieza → crecimiento ilimitado | Medio | TTL/purga de cola en sincronización exitosa. |

---

## 9. Referencias

- Plan maestro: `docs/plans/closeout-plan-2026-11-02.md` §Fase 3.
- Auditoría mobile: `docs/mobile-app-ui-audit.md` (37 rutas, pantallas A/B/C/E).
- Specs athlete-real-data-images: `openspec/changes/athlete-real-data-images/specs/mobile-today/spec.md`, `mobile-history/spec.md`.
- Reglas: `apps/rules/mobile-rules/*` (00-06), `apps/rules/13-testing.md`, `AGENTS.md` (Global Mobile UI Validation Rule).

---

## Definition of Done (Fase 3)

- GPS batch + offline queue MMKV + reintento idempotente implementados
- Sync iniciado/completado con backend + audio cues + estado UI
- `npm test` verde, `npx tsc --noEmit` verde
- Validación real en emulador/dispositivo: navegación, listas, ejecución, summary, membership gate pasan

---

**Rol responsable:** `dev-react-native`  
**Tiempo estimado:** 4-6 días  
**Prioridad:** P1  
**Bloqueador potencial:** validación real dispositivo (regla AGENTS.md — sin dispositivo real = BLOCKED, no COMPLETE)

---

## Plan de ejecución por slices (sugerido para dispatch)

| Slice | Título | Archivos | Rol | AC |
|---|---|---|---|---|
| 3.1 | GPS en lote (batch, filtro accuracy, cap 100) | `apps/mobile/src/infrastructure/api/`, GPS service | dev-react-native | AC-3.1 |
| 3.2 | Offline queue MMKV | `apps/mobile/src/infrastructure/storage/`, MMKV | dev-react-native | AC-3.2 |
| 3.3 | Reintento idempotente | idempotency key + backend dedup | dev-react-native | AC-3.3 |
| 3.4 | Sync estado UI + audio cues | WorkoutExecution + audio | dev-react-native | AC-3.4 |
| 3.5 | Pruebas Jest + TSC | `apps/mobile/` | dev-react-native | AC-3.5 |
| 3.6 | Validación real dispositivo | emulador/dispositivo real | dev-react-native | AC-3.6 |
