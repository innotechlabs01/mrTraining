# Session Summary — Coach Dashboard & Auth Fixes

## Objective
- Hacer profesional el dashboard del coach con sidebar completa, métricas de negocio y módulos de gestión (usuarios, training, planes, eventos, settings, soporte).
- Depurar el flujo de auth para que el coach no pase por onboarding/setup y la web redirija a /coach.

## Important Details
- Web app es coach-only; athlete será solo mobile.
- Coach bypassa setup → role-selection → onboarding → welcome-dashboard; va directo a /coach tras sign-up.
- Middleware redirige a /coach (no /athlete/today).
- Clerk v6: `ClerkProvider` se usa en layouts como server component (sin `'use client'`). Build pasa con 44 páginas.

## Work State
### Completed
- Dos cuentas test creadas via Clerk CLI: `test@mrtraining.app` / `coach@mrtraining.app` (pass: `Pass4Testing!`).
- `.env.local` poblado con `clerk env pull`.
- Nuevos tipos añadidos: `TrainingMode`, `NavItem`, `DashboardMetrics`, `Plan`, `CoachEvent`, `AssignedWorkout`.
- Mock data nueva: `MOCK_DASHBOARD_METRICS`, `MOCK_REVENUE_HISTORY`, `MOCK_PLANS`, `MOCK_EVENTS`, `MOCK_ASSIGNED_WORKOUTS`.
- CoachSidebar.tsx: navegación completa (Dashboard, Usuarios, Training con submenu, Planes, Eventos, Settings, Soporte) + timeline colapsable.
- CoachLayout.tsx actualizado: usa CoachSidebar en lugar de TimelineSidebar.
- Dashboard page (`/coach`): tarjetas de ingresos, atletas activos, nuevos, pagos pendientes + gráfico de barras de ingresos + distribución por plan.
- 9 nuevas rutas creadas:
  - `/coach` → Dashboard con métricas
  - `/coach/users` → Lista de atletas con búsqueda y flag filter
  - `/coach/users/[id]` → Perfil individual del atleta
  - `/coach/training` → Hub (Workouts, Programas, Asignar)
  - `/coach/training/programs` → Programas con filtro por modalidad
  - `/coach/training/asignar` → Flujo completo de asignación a atletas
  - `/coach/planes` → Cards de planes (Starter/Pro/Elite/Pro Anual)
  - `/coach/events` → Calendario de eventos con filtros (tipo, modalidad, estado)
  - `/coach/settings` → Tabs: Perfil, Notificaciones, Facturación, Preferencias
  - `/coach/support` → Contacto + FAQ accordion
- Auth flow corregido:
  - Middleware: redirect → `/coach`
  - Role-selection: coach/strength-coach → `/coach` (salta onboarding)
  - Welcome-dashboard: redirect → `/coach`
- Layouts son server components (`ClerkProvider` sin `'use client'`). Build pasa con 44 páginas, 0 errores.

### Notes / Learnings
- Clerk v6 con `'use client'` en layouts rompe build estático (exige `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en tiempo de compilación). Solución: mantener layouts como server components.
- El error original de sign-up (`useCodeInput is not a function`) necesita diagnóstico separado — no está relacionado con server/client boundary del layout.
- CoachSidebar usa datos mock — migrar a Supabase queries en fase 2.

## Relevant Files
- apps/web/src/app/(auth)/layout.tsx: ClerkProvider server component
- apps/web/src/app/(app)/layout.tsx: ClerkProvider server component
- apps/web/src/middleware.ts: redirect `/coach`
- apps/web/src/app/(auth)/role-selection/page.tsx: coach bypass
- apps/web/src/app/(auth)/welcome-dashboard/page.tsx: redirect a `/coach`
- apps/web/src/features/coach/components/layout/CoachSidebar.tsx: nuevo sidebar completo
- apps/web/src/features/coach/components/layout/CoachLayout.tsx: usa CoachSidebar
- apps/web/src/features/coach/components/dashboard/CoachDashboard.tsx: métricas + gráfico
- apps/web/src/features/coach/types/index.ts: nuevos tipos
- apps/web/src/features/coach/data/_mocks.ts: nuevos mocks
- apps/web/src/app/(app)/coach/: todas las rutas nuevas (users, training, planes, events, settings, support)
