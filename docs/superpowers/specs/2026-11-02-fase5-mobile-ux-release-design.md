# Fase 5 — Pulido mobile UX y release readiness — Design Spec

> **Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. Planificación desglosada en slices listos para PR. No incluye código de implementación.**

---

## 1. Problema

La aplicación móvil necesita pulido UX final y documentación de release: (1) rediseño de pantallas B/C según inventario de `docs/mobile-app-ui-audit.md` (históricamente 25 pantallas B, 9 C; muchas ya atendidas en Phases 4A-5 del auditoría, quedar solo las no atendidas); (2) re-ejecutar auditoría Mobile UI y Playwright Next; (3) consolidar documentación de migraciones, contratos API y variables env; (4) documentar corte y reversión.

Nota: el auditoría mobile (actualizada 2026-10-17) reporta que Phases 4A-5 ya cubrieron pantallas B/C pendientes; quedan AiWorkoutScreen (MediaPipe bloqueado nativo) e ImportHistoryScreen como bloqueos documentados. Esta fase cierra lo residual y prepara release.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| ux-ui-designer | Diseño UX (apps/mobile) | Rediseño residual B/C, criterios UX, auditoría re-ejecución |
| dev-react-native | React Native (apps/mobile) | Implementar rediseños, Playwright Next, validación dispositivo |
| dev-backend / tech-writer | Documentación | Migraciones, contratos API, variables env, corte/reversión |

### Acceptance Criteria

- [ ] **AC-5.1:** Given inventario `docs/mobile-app-ui-audit.md`, When se rediseñan pantallas B/C residuales, Then todas pasan criterios UX (loading, empty, error, primary action, 60 FPS, touch ≥44pt, safe areas).
- [ ] **AC-5.2:** Given re-ejecución de auditoría Mobile UI y Playwright Next, When se valida, Then cero regresiones críticas; pantallas consistentes con design system.
- [ ] **AC-5.3:** Given documentación consolidada, When se revisan migraciones, contratos API y variables env, Then todo documentado y actualizado.
- [ ] **AC-5.4:** Given corte y reversión, When se documentan, Then hay plan de rollback para cada cambio de schema/contrato.

---

## 3. Criterios UX (obligatorios)

- **Loading:** skeleton o spinner contextual.
- **Empty:** ilustración + copy + acción sugerida.
- **Error:** mensaje humano + retry.
- **Primary action:** una por pantalla.
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

No aplica a esta fase (pulido de pantallas existentes).

---

## 5. Diseño (la solución)

### Slices de trabajo (PR-ready, en orden)

1. **Slice 5.1 — Rediseño pantallas B/C residuales**: según inventario de `docs/mobile-app-ui-audit.md` (quedan las no atendidas en 4A-5B-5C).
2. **Slice 5.2 — Re-ejecutar auditoría Mobile UI**: validar consistencia con design system; Playwright Next para flujos web críticos.
3. **Slice 5.3 — Consolidar documentación**: migraciones (¿qué se aplicó, qué quedó bloqueado), contratos API (Go), variables env.
4. **Slice 5.4 — Documentar corte y reversión**: plan de rollback por cambio de schema/contrato.

### Estructura de rutas / screens

Todas las 37 rutas registradas en `Navigation.tsx` (per auditoría).

### Componentes

No se definen nuevos; se ajustan existentes al design system.

### Types

No aplica.

---

## 6. API (si aplica)

No aplica (pulido UI + documentación).

| Método | Path | Purpose |
|---|---|---|
| — | — | — |

---

## 7. Fuera de scope (explícito)

- Nuevas funcionalidades de negocio (solo pulido UX y docs).
- Migraciones nuevas (bloqueadas hasta Fase 1; Fase 5 solo documenta las existentes).

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Inventario B/C desactualizado vs auditoría 2026-10-17 | Medio | Volver a leer `docs/mobile-app-ui-audit.md` antes de asignar slices. |
| Documentación desactualizada respecto al código real | Alto | Verificar cada contrato API contra `apps/api` antes de documentar. |

---

## 9. Referencias

- Auditoría: `docs/mobile-app-ui-audit.md` (37 rutas, estados A/B/C/D/E, Phases 4A-5 completadas).
- Plan maestro: `docs/plans/closeout-plan-2026-11-02.md` §Fase 5.
- Reglas: `apps/rules/mobile-rules/*`, `apps/rules/01-brand-guidelines.md`, `apps/rules/02-design-system.md`, `apps/rules/03-ux-workflows.md`.

---

## Definition of Done (Fase 5)

- Pantallas B/C residuales rediseñadas y pasando criterios UX
- Auditoría Mobile UI re-ejecutada sin regresiones críticas; Playwright Next verde
- Documentación de migraciones, contratos API y variables env consolidada
- Plan de corte y reversión documentado

---

**Roles responsables:** `ux-ui-designer` + `dev-react-native` (+ `dev-backend`/`tech-writer` para docs)  
**Tiempo estimado:** continuo (P2)  
**Prioridad:** P2 (no bloquea piloto controlado si Fases 0-2 verdes)

---

## Plan de ejecución por slices (sugerido para dispatch)

| Slice | Título | Archivos | Rol | AC |
|---|---|---|---|---|
| 5.1 | Rediseño pantallas B/C residuales | `apps/mobile/src/features/*/screens/` | ux-ui-designer + dev-react-native | AC-5.1 |
| 5.2 | Re-ejecutar auditoría Mobile UI + Playwright Next | `apps/mobile/`, `apps/web/` e2e | dev-react-native + dev-front | AC-5.2 |
| 5.3 | Consolidar documentación (migraciones, contratos API, env) | `docs/`, `apps/api/migrations/`, `.env.example` | tech-writer + dev-backend | AC-5.3 |
| 5.4 | Documentar corte y reversión | `docs/plans/closeout-plan-2026-11-02.md` | dev-backend | AC-5.4 |
