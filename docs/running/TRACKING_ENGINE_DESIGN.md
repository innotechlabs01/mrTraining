# MR Training — Tracking Engine Design

Fecha: 2026-10-28
Estado: Borrador para revisión
Referencia: docs/running/OPEN_SOURCE_TRACKING_MAP.md

---

## 1. Modelo de Estados de Sesión

### 1.1 Estados válidos

| Estado | Descripción | Transiciones permitidas |
|---|---|---|
| `preparado` | Sesión creada, lista para iniciar | → `iniciando` |
| `iniciando` | Iniciando GPS y sensores | → `en_ejecucion` o `error_recuperable` |
| `en_ejecucion` | Tracking activo, GPS fluyendo | → `en_pausa` o `finalizando` |
| `en_pausa` | Sesión pausada por el usuario | → `reanudando` o `finalizando` |
| `reanudando` | Reanudando tras pausa | → `en_ejecucion` o `error_recuperable` |
| `finalizando` | Sesión detenida, métricas finales | → `pendiente_sincronizacion` |
| `pendiente_sincronizacion` | Lista para enviar al backend | → `sincronizado` o `error_recuperable` |
| `sincronizado` | Confirmado por el backend | — (terminal) |
| `error_recuperable` | Error de red/GPS, se puede reintentar | → `iniciando` / `reanudando` / `pendiente_sincronizacion` |
| `error_no_recuperable` | Error crítico (datos corruptos, permiso denegado) | — (terminal, requiere intervención de usuario) |

### 1.2 Invariantes

1. **Un tracker simultáneo por sesión:** No puede haber dos `en_ejecucion` para la misma `session_id`.
2. **Recuperación de estado:** El estado persistido (MMKV + SQLite local) debe permitir restaurar la sesión tras cierre inesperado de la app.
3. **Estado local vs remoto:** El estado de tracking local (`en_ejecucion`, `en_pausa`) es independiente del estado de sincronización remota (`pendiente_sincronizacion`, `sincronizado`).

### 1.3 Máquina de estados (pseudocódigo)

```
estado_actual = preparado

al iniciar_sesion():
    si estado_actual != preparado: error
    estado_actual = iniciando
    persistir_estado()
    iniciar_gps()
    si gps_ok:
        estado_actual = en_ejecucion
    sino:
        estado_actual = error_recuperable
    persistir_estado()

al pausar():
    si estado_actual != en_ejecucion: error
    estado_actual = en_pausa
    detener_gps()
    persistir_estado()

al reanudar():
    si estado_actual != en_pausa: error
    estado_actual = reanudando
    iniciar_gps()
    si gps_ok:
        estado_actual = en_ejecucion
    sino:
        estado_actual = error_recuperable
    persistir_estado()

al finalizar():
    si estado_actual not in [en_ejecucion, en_pausa]: error
    estado_actual = finalizando
    detener_gps()
    calcular_metricas_finales()
    persistir_estado()
    estado_actual = pendiente_sincronizacion
    persistir_estado()

al sincronizar_exitoso():
    si estado_actual == pendiente_sincronizacion:
        estado_actual = sincronizado
        persistir_estado()

al error_red():
    si estado_actual == pendiente_sincronizacion:
        estado_actual = error_recuperable
        persistir_estado()
```

---

## 2. Pipeline de Localización

### 2.1 Etapas del pipeline

```
1. Recepción de posición (expo-location)
   ↓
2. Validación de coordenadas y timestamp
   ↓
3. Validación de precisión (accuracy <= umbral)
   ↓
4. Detección de duplicados (mismo timestamp/coordenadas)
   ↓
5. Detección de saltos GPS (distancia excesiva en poco tiempo)
   ↓
6. Filtrado de ruido (umbral de aceleración/velocidad)
   ↓
7. Cálculo de distancia válida (Haversine)
   ↓
8. Actualización de ritmo y velocidad
   ↓
9. Generación de parciales (cada km o segmento)
   ↓
10. Persistencia local (MMKV + SQLite)
    ↓
11. Actualización de sesión activa
    ↓
12. Preparación para sincronización (cola de eventos)
```

### 2.2 Parámetros de filtros (documentados)

| Filtro | Parámetro | Valor | Efecto secundario | Prueba |
|---|---|---|---|---|
| Precisión GPS | `maxAccuracyMeters` | 50.0 | Descarta puntos urbanos con multipath | Sintético: punto con accuracy 60 → descartado |
| Salto GPS | `maxSpeedMps` | 8.0 (28.8 km/h, sprint élite) | Descarta punto si velocidad > umbral | Sintético: salto 100m en 1s → descartado |
| Salto GPS | `maxTimeGapSec` | 300 | Si gap > 5min, reset de distancia acumulada | Sintético: gap 10min → nueva segmento |
| Duplicado | `minTimeBetweenPointsMs` | 1000 | Descarta puntos con timestamp repetido | Sintético: mismo timestamp → descartado |
| Ruido | `minDistanceMeters` | 1.0 | Ignora movimientos < 1m (estático) | Sintético: punto a 0.5m → ignorado |

### 2.3 Trazabilidad

Se conserva:
- **Posiciones originales:** Todas las posiciones recibidas del GPS (incluso descartadas), con flag `valido: boolean` y `motivo_descartado: string`.
- **Posiciones válidas:** Subconjunto usado para cálculos.
- **Métricas calculadas:** Distancia acumulada, ritmo, velocidad, parciales — con referencia a los puntos válidos usados.

---

## 3. Cálculos

### 3.1 Convenciones únicas

| Magnitud | Unidad interna | Unidad de presentación |
|---|---|---|
| Distancia | metros | km (2 decimales) |
| Duración | segundos | mm:ss o hh:mm:ss |
| Ritmo | segundos/km | "5:30" min/km |
| Velocidad | metros/segundo | km/h |
| Frecuencia cardíaca | BPM | BPM (entero) |
| Cadencia | pasos/minuto | spm (entero) |
| Elevación | metros | metros (1 decimal) |

### 3.2 Tratamiento de casos edge

| Caso | Comportamiento |
|---|---|
| Pausa | Tiempo en pausa NO cuenta como tiempo en movimiento. Distancia no avanza. |
| Distancia cero | Ritmo = "--:--" (no se divide por cero). |
| Valores ausentes | Campo nulo en respuesta; no se infiere ni se interpola. |
| Señal deficiente | Puntos con accuracy > 50m se descartan; sesión marca `gps_quality: poor`. |
| Sesión incompleta | Se guarda con estado `pendiente_sincronizacion`; métricas parciales válidas. |
| Error del sensor | Se registra evento `sensor_error`; sesión continúa con datos disponibles. |

### 3.3 Tiempo transcurrido vs tiempo en movimiento

- **Tiempo transcurrido:** Desde `started_at` hasta `finished_at` (incluye pausas).
- **Tiempo en movimiento:** Solo cuando estado == `en_ejecucion` (excluye pausas).
- Ritmo medio se calcula sobre tiempo en movimiento, no transcurrido.

---

## 4. Persistencia Local

### 4.1 Qué guardar

| Dato | Almacenamiento | Clave | Sobreviviente a cierre app |
|---|---|---|---|
| Estado de sesión actual | MMKV | `running_session_state:{sessionId}` | Sí |
| Último timestamp procesado | MMKV | `running_last_ts:{sessionId}` | Sí |
| Posiciones GPS (lote) | SQLite local | `running_gps_points` | Sí |
| Métricas acumuladas | MMKV | `running_metrics:{sessionId}` | Sí |
| Parciales | MMKV | `running_splits:{sessionId}` | Sí |
| Segmento actual | MMKV | `running_current_segment:{sessionId}` | Sí |
| Repetición y serie actual | MMKV | `running_rep_set:{sessionId}` | Sí |
| Estado del audio | MMKV | `running_audio:{sessionId}` | Sí |
| Eventos pendientes de sync | SQLite local | `running_sync_queue` | Sí |

### 4.2 No depender exclusivamente de React state

Todo dato crítico debe escribirse en MMKV o SQLite antes de notificar a la UI. El estado en memoria es solo una vista derivable del almacenamiento.

---

## 5. Segundo Plano

### 5.1 Estados de plataforma

| Estado de app | iOS | Android | Expo |
|---|---|---|---|
| Pantalla bloqueada | Background location requerido | Foreground service + location | expo-background-fetch |
| App en segundo plano | Background location | Foreground service | expo-background-fetch |
| Proceso suspendido | Puede continuar con bg location | Puede continuar con fg service | Limitado |
| Proceso terminado por SO | No garantizado | No garantizado | No garantizado |
| Reinicio dispositivo | No recupera sesión | No recupera sesión | No recupera sesión |

### 5.2 Requisitos documentados

- **Development build:** Requerido para background location y foreground service.
- **Permisos iOS:** `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes` (location).
- **Permisos Android:** `ACCESS_BACKGROUND_LOCATION`, servicio en primer plano con notificación.
- **Expo:** `expo-location` con `foreground` y `background` permisos; `expo-task-manager` para tareas largas.

### 5.3 Limitación explícita

Una sesión de running **no garantiza continuidad** tras cierre forzado del proceso por el sistema o reinicio del dispositivo sin implementación nativa específica y pruebas en dispositivo real. Esto está fuera de scope inicial (DEFER/BLOCKED).

---

## 6. Arquitectura del Motor (TypeScript / Go)

### 6.1 Capas

```
Capa de presentación (móvil/web)
    ↓
Capa de aplicación (hooks mobile / servicio Go)
    ↓
Motor de tracking (lógica pura, testeable)
    ↓
Adaptador de localización (expo-location / Go repository)
    ↓
Filtro de posiciones (algoritmo puro, posiciones sintéticas en pruebas)
    ↓
Calculadora de métricas (distancia, ritmo, parciales)
    ↓
Gestor de intervalos (segmentos, repeticiones)
    ↓
Persistencia local (MMKV + SQLite local)
    ↓
Cola de sincronización (reintentos, idempotencia)
    ↓
API del backend (Go Fiber + PostgreSQL)
```

### 6.2 Motor comprobable sin GPS real

El motor de tracking debe ser testeable con posiciones y timestamps sintéticos:

```typescript
// Ejemplo de prueba sintética
const puntosSinteticos = [
  { lat: 40.4168, lng: -3.7038, timestamp: "2026-10-28T10:00:00Z", accuracy: 5 },
  { lat: 40.4170, lng: -3.7040, timestamp: "2026-10-28T10:00:05Z", accuracy: 5 },
  // ... 100m en 5 segundos → 20 m/s = 72 km/h → salto GPS detectado
];

const resultado = filtroGPS.procesar(puntosSinteticos);
expect(resulto.validos).toHaveLength(1); // solo el primero
expect(resulto.descartados[0].motivo).toBe("salto_gps");
```

### 6.3 Implementación en móvil

- `apps/mobile/src/features/training/domain/TrackingEngine.ts` — lógica pura (filtro, métricas, máquina de estados)
- `apps/mobile/src/features/training/infrastructure/LocationAdapter.ts` — wrapper expo-location
- `apps/mobile/src/features/training/infrastructure/GpsFilter.ts` — filtro de posiciones
- `apps/mobile/src/features/training/infrastructure/MetricsCalculator.ts` — distancia, ritmo, parciales
- `apps/mobile/src/features/training/infrastructure/SessionStateManager.ts` — MMKV persistencia

### 6.4 Implementación en backend

Ya existe en `apps/api/internal/application/running/service.go` y `apps/api/internal/infrastructure/running/repository.go`. Mejoras necesarias:
- Validación de puntos GPS entrantes (precisión, saltos)
- Cálculo de distancia acumulada desde puntos GPS
- Generación de polyline codificada para `gps_route`

---

## 7. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Precisión GPS variable en urbano | Medio | Filtro de accuracy + detección de saltos + flag de calidad |
| Batería drenada por GPS continuo | Alto | Intervalo configurable; pausa automática sin movimiento |
| Pérdida de datos por cierre de app | Medio | Persistencia en MMKV + SQLite antes de notificar UI |
| Duplicados tras re-sync | Bajo | `external_id` único en backend; idempotencia por `ON CONFLICT` |
| Ritmo inexacto por saltos GPS | Medio | Filtro de velocidad máxima + suavizado opcional |
