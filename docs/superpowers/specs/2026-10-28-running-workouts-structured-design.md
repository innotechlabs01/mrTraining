# Running Workouts Structured — Design Spec

> **Template:** copy to `YYYY-MM-DD-<feature>-design.md` before filling.
> **Rule:** toda feature coach nueva pasa Spec → Plan → BOARD.md → Worktree → PR
> (`apps/rules/14-team-workflow.md` §2).

---

## 1. Problema

El coach no puede diseñar, asignar ni guiar entrenamientos de running estructurados (intervalos, series, recuperación, enfriamiento) desde MR Training. El atleta no tiene una pantalla de ejecución guiada que le diga qué segmento hacer, a qué ritmo y por cuánto tiempo. Todo queda en texto descriptivo sin estructura ejecutable. Sin esto, el flujo "coach prescribe → atleta ejecuta → coach revisa" está incompleto para running.

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|-----|----------|----------------|
| Coach | Entrenador que diseña y asigna entrenamientos | Crear plantillas running con segmentos ordenados, asignarlas a atletas autorizados, revisar ejecuciones |
| Athlete | Deportista que ejecuta lo prescrito | Ver asignaciones de hoy, ejecutar segmento a segmento con GPS, ver resumen real post-sesión |

### Acceptance Criteria

Formato: `Given / When / Then`. Uno por comportamiento observable.

- [ ] **AC-1:** Given un coach autenticado, When crea una plantilla running con calentamiento, 4×1 km, recuperación y enfriamiento, Then se guarda y puede asignar a un atleta.
- [ ] **AC-2:** Given una plantilla asignada, When el atleta abre su app móvil, Then ve la asignación de hoy con segmento actual, objetivo de ritmo/FC y mapa si existe.
- [ ] **AC-3:** Given el atleta inició la sesión, When completa un segmento y avanza al siguiente, Then la app guía el siguiente segmento y registra GPS en lote.
- [ ] **AC-4:** Given el atleta finalizó la sesión, When se sincroniza con el backend, Then el coach puede consultar el resumen real (distancia, duración, intervalos plan vs reales) y no hay duplicados de puntos GPS.
- [ ] **AC-5:** Given el coach modificó la plantilla después de asignar, When el atleta ya inició la sesión, Then la sesión conserva la instantánea de prescripción original (no se altera retroactivamente).
- [ ] **AC-6:** Given un coach, When consulta entrenamientos de otro coach, Then no ve nada (aislamiento por coach/atleta).

## 3. Criterios UX (obligatorios, no opcionales)

- **Loading:** skeleton o spinner contextual (nunca pantalla vacía).
- **Empty:** ilustración + copy + acción sugerida ("No hay entrenamientos asignados hoy").
- **Error:** mensaje humano + retry. Nunca stack trace.
- **Primary action:** una por pantalla ("Comenzar sesión", "Guardar plantilla", "Asignar").
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas respetadas, audio cues configurables.
- **Offline:** sesión activa y puntos GPS se guardan localmente y se reintentan al recuperar conexión (idempotente).

## 4. Flujo de usuario

```
Coach diseña plantilla → Coach asigna a atleta → Atleta ve asignación de hoy
  → Atleta abre detalle (segmentos, objetivos, mapa) → Atleta inicia sesión
  → App guía segmento actual (tiempo/distancia restante, ritmo, audio)
  → Atleta pausa/reanuda/finaliza → GPS se sincroniza → Atleta ve resumen real
  → Coach consulta resultado → aislado por coach/atleta
```

Incluir: back navigation, estados de error en cada paso, offline si aplica.

## 5. Diseño (la solución)

### Estructura de rutas / screens (móvil)

```
src/features/training/
├── presentation/screens/
│   ├── RunningWorkoutListScreen.tsx     ← lista asignaciones de hoy
│   ├── RunningWorkoutDetailScreen.tsx   ← detalle previo (segmentos, objetivos, mapa)
│   ├── RunningExecutionScreen.tsx       ← ejecución guiada (segmento actual, GPS, audio)
│   └── RunningSessionSummaryScreen.tsx  ← resumen post-sesión
├── presentation/components/
│   ├── RunningSegmentList.tsx
│   ├── RunningSegmentCard.tsx
│   ├── RunningMapView.tsx
│   └── RunningAudioCues.tsx
├── application/
│   ├── useRunningWorkouts.ts            ← React Query hooks (list, detail)
│   ├── useRunningExecution.ts           ← ejecución activa (pausa, reanuda, finaliza)
│   └── useRunningSync.ts                ← offline queue y reintento idempotente
├── domain/
│   ├── RunningWorkoutTemplate.ts
│   ├── RunningWorkoutSegment.ts
│   ├── RunningWorkoutAssignment.ts
│   └── RunningWorkoutSnapshot.ts
└── infrastructure/
    ├── runningWorkoutRepository.ts
    └── runningWorkoutApi.ts
```

### Componentes (uno por responsabilidad)

| Componente | Responsabilidad |
|------------|-----------------|
| RunningWorkoutListScreen | Lista de asignaciones de hoy con estado |
| RunningWorkoutDetailScreen | Detalle previo: segmento, objetivo pace/FC, mapa planificado, botón comenzar |
| RunningExecutionScreen | Ejecución guiada: segmento actual, tiempo/distancia restante, pace actual, controles pausa/reanuda/finaliza |
| RunningSessionSummaryScreen | Resumen real: distancia, duración, pace medio, intervalos plan vs reales, mapa recorrido |
| RunningMapView | Mapa con polilínea planificada o registrada |
| RunningAudioCues | Señales de audio al cambiar segmento |

### Types (TypeScript, móvil)

```typescript
// Referencia: contrato Go API en apps/api/internal/domain/running/
export interface RunningWorkoutTemplate {
  id: string;
  coachId: string;
  name: string;
  description?: string;
  type: 'free_run' | 'continuous_distance' | 'timed_run' | 'intervals' | 'series' | 'recovery' | 'tempo' | 'progressive';
  targetPaceMinPerKm?: number;
  targetPaceMaxPerKm?: number;
  targetHeartRateMin?: number;
  targetHeartRateMax?: number;
  targetCadence?: number;
  targetDistanceKm?: number;
  targetDurationSec?: number;
  segments: RunningWorkoutSegment[];
  createdAt: string;
  updatedAt: string;
}

export interface RunningWorkoutSegment {
  id: string;
  templateId: string;
  order: number;
  type: 'warmup' | 'main' | 'interval' | 'recovery' | 'cooldown';
  instruction: string;
  spokenInstruction?: string;
  targetDurationSec?: number;
  targetDistanceKm?: number;
  targetPaceMinPerKm?: number;
  targetPaceMaxPerKm?: number;
  targetHeartRateMin?: number;
  targetHeartRateMax?: number;
  repetitions?: number;
  recoverySec?: number;
  completionCriteria: 'time' | 'distance' | 'manual';
}

export interface RunningWorkoutAssignment {
  id: string;
  templateId: string;
  athleteId: string;
  coachId: string;
  scheduledDate: string;
  status: 'assigned' | 'available' | 'started' | 'completed' | 'skipped' | 'cancelled';
  athleteInstructions?: string;
  createdAt: string;
}

export interface RunningWorkoutSnapshot {
  id: string;
  assignmentId: string;
  sessionId: string;
  templateCopy: RunningWorkoutTemplate; // instantánea de prescripción al iniciar
  capturedAt: string;
}
```

## 6. API (si aplica)

**Regla:** endpoints NUEVOS se definen en `apps/api` (Go) primero. El frontend los consume, nunca los inventa.

| Método | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/running/workouts/templates | Crear plantilla running |
| GET | /api/v1/running/workouts/templates | Listar plantillas del coach |
| GET | /api/v1/running/workouts/templates/:id | Detalle de plantilla con segmentos |
| PUT | /api/v1/running/workouts/templates/:id | Editar plantilla |
| DELETE | /api/v1/running/workouts/templates/:id | Eliminar plantilla (soft) |
| POST | /api/v1/running/workouts/assignments | Asignar entrenamiento a atleta |
| GET | /api/v1/running/workouts/assignments | Listar asignaciones del coach / del atleta |
| GET | /api/v1/running/workouts/assignments/:id | Detalle de asignación |
| POST | /api/v1/running/workouts/sessions/:id/start | Iniciar sesión con snapshot de prescripción |
| POST | /api/v1/running/workouts/sessions/:id/complete | Finalizar sesión con métricas reales |
| GET | /api/v1/running/workouts/sessions/:id | Detalle de sesión ejecutada (plan vs real) |
| GET | /api/v1/coach/athletes/:id/running/assignments | Asignaciones de un atleta (coach) |

Contrato detalle: `apps/rules/08-api-specification.md`.

## 7. Fuera de scope (explícito)

- No clon completo de RunnerUp/Strava/Garmin Connect.
- No compatibilidad con todos los relojes ni FC en segundo plano sin verificar capacidades nativas iOS/Android.
- No importación/exportación GPX masiva (solo si encaja con capacidades existentes).
- No relojes WearOS ni integración de hardware fuera de lo existente (Garmin provider ya existe).
- No segunda base de datos offline ni arquitectura offline nueva (usar MMKV/React Query persist que ya existe).

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `running_sessions` y `device_connections` no tienen DDL en migraciones | Alto | Crear migración de DDL faltante antes de construir encima |
| Licencia RunnerUp es GPL-3.0 (copyleft) | Alto | Solo usar como referencia funcional, NUNCA copiar código |
| Esquema real de Turso no exportado | Medio | Esquema provisional etiquetado; validar contra Supabase QA antes de producción |
| GPS en segundo plano (pantalla bloqueada) | Medio | Documentar limitación; usar mecanismos existentes de expo-background-fetch |

## 9. Referencias

- Spec similar previo: `docs/superpowers/specs/2026-07-08-live-workout-experience-design.md`
- Rules relevantes: `apps/rules/00-product-vision.md` (§4.1.2 Running), `apps/rules/04-database-design.md`, `apps/rules/05-backend-architecture.md`, `apps/rules/06-frontend-architecture.md`, `apps/rules/mobile-rules/00-mobile-architecture.md`, `apps/rules/08-api-specification.md`, `apps/rules/13-testing.md`
- Referencia funcional (NO copiar código, licencia GPL-3.0): https://github.com/jonasoreland/runnerup