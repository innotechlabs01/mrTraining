# Sincronizador de Secretos — MR Training

Componente para gestionar la sincronización de secretos entre Infisical y Google Secret Manager, con soporte para entornos local/DEV, QA y Production.

## Arquitectura de Ambientes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   LOCAL / DEV   │     │       QA        │     │    PRODUCTION       │
│                 │     │                 │     │                     │
│ Infisical DEV   │────►│ Infisical QA    │────►│ Infisical Production│
│   (fuente)      │     │   (fuente QA)   │     │   (fuente prod)     │
│                 │     │                 │     │                     │
│ No obligatorio  │────►│ GCP Secret Mgr  │────►│ GCP Secret Mgr      │
│                 │     │   (para Cloud   │     │   (para Cloud       │
│                 │     │    Run QA)      │     │    Run Prod)        │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
```

### Reglas de separación

| Componente | Local/DEV | QA | Production |
|------------|-----------|-----|------------|
| Fuente de secretos | Infisical DEV | Infisical QA | Infisical Production |
| Secret Manager | No obligatorio | GCP Secret Manager | GCP Secret Manager |
| Backend | Docker / k3d | Cloud Run | Cloud Run |
| Despliegue | Local | Controlado (aprobación) | No implementar todavía |

### Políticas clave

1. **No copiar valores de DEV a QA automáticamente** — Los valores QA proceden de Infisical QA
2. **Los nombres y estructura pueden sincronizarse** — Solo los metadatos, no los valores
3. **Secretos nuevos requieren autorización** — Promoción controlada vía GitHub Environment QA
4. **Secretos eliminados requieren revisión de dependencias** — No se borran automáticamente
5. **Production permanece aislado** — Sin promoción automática desde QA

## Sincronizador de Secretos

### Flujo de sincronización

1. **Inventario** — Identificar nombres de secretos en Infisical y GCP Secret Manager
2. **Comparación** — Detectar nuevos, modificados, eliminados y sin cambios (sin exponer valores)
3. **Validación** — Verificar que los secretos obligatorios estén completos
4. **Aprobación** — Generar reporte y solicitar autorización para promover a QA
5. **Sincronización** — Crear nuevas versiones únicamente cuando existe cambio real
6. **Verificación** — Comprobar que Secret Manager contiene las versiones esperadas

### Comandos disponibles

Desde `infrastructure/secrets/`:

```bash
# Inicializar módulos Go
go mod tidy

# Ejecutar pruebas unitarias
go test ./sync/... -v -count=1

# Sincronización dry-run (predeterminado, seguro)
go run ./cmd/sync-sync --source dev --target qa --dry-run

# Sincronización real (requiere aprobación previa)
go run ./cmd/sync-sync --source dev --target qa --apply

# Análisis de retención de versiones (dry-run)
go run ./cmd/sync-retention --project mr-training-backend --dry-run

# Análisis de retención con destrucción (requiere autorización)
go run ./cmd/sync-retention --project mr-training-backend --apply
```

### Seguridad

- ✅ Los valores sensibles **NUNCA** se imprimen en logs
- ✅ Se usan hashes SHA-256 para comparación de valores
- ✅ Los secretos no se almacenan en Git
- ✅ Los secretos no se almacenan en Terraform state
- ✅ Modo dry-run por defecto
- ✅ No se usan service account keys permanentes (usa WIF)
- ✅ No se mezclan ambientes
- ✅ No se modifican recursos de producción

### Política de retención de versiones (QA — ESTRICTA)

**Política estricta de EXACTAMENTE 2 versiones recuperables por secreto:**

| Versión | Estado | Propósito |
|---------|--------|-----------|
| 1 (más reciente) | ENABLED | Versión actual en uso por Cloud Run |
| 2 (anterior) | ENABLED | Reservada para rollback inmediato |
| 3+ (anteriores) | DESTROYED | Eliminadas (no DISABLED — siguen generando costo) |

| Parámetro | Valor (QA) | Valor (Production) |
|-----------|------------|-------------------|
| Versiones recuperables (keep_latest) | **EXACTAMENTE 2** (no configurable) | 3 (requiere autorización explícita) |
| Máximo de versiones ENABLED por secreto | **2** (estricto) | 3 (requiere autorización) |
| Estado de versiones sobrantes | **DESTROYED** (no DISABLED) | DESTROYED (requiere autorización) |
| Período de gracia antes de destruir | 0 días (inmediato) | 90 días (requiere autorización) |
| Dry-run por defecto | true | true |

**Reglas obligatorias de retención (QA):**

1. **Máximo 2 versiones ENABLED** por secreto (actual + anterior para rollback)
2. **Nunca crear versión nueva** si SHA-256 del valor de Infisical coincide con versión actual
3. **No persistir hashes ni valores** en logs, reportes o archivos
4. **Crear versión nueva ANTES** de destruir cualquier versión anterior
5. **Verificar** que nueva versión se almacenó y Cloud Run puede usarla
6. **Preservar** versión anterior para rollback
7. **No destruir** versiones referenciadas por revisiones activas de Cloud Run
8. **Destruir** (estado DESTROYED) versiones sobrantes — **no DISABLED** (siguen generando costo)
8. **Si no es seguro destruir** → conservar y reportar excepción
9. **No eliminar** secretos completos automáticamente
10. **No ejecutar destrucciones** automáticas en pruebas/dry-run
11. **Production** queda fuera de política automática (requiere autorización explícita)

### Costos

| Estado | Genera costo de almacenamiento |
|--------|--------------------------------|
| ENABLED | Sí |
| DISABLED | **Sí** (igual que ENABLED) |
| DESTROYED | **No** (deja de generar costo) |

- No crear versiones duplicadas cuando valor no cambia (comparación SHA-256)
- Las lecturas de Cloud Run no se reducen por destruir versiones antiguas
- No asumir que destruir versiones reduce costos de acceso (solo almacenamiento)

### Archivos de configuración

```
infrastructure/secrets/
├── environments/
│   ├── dev/config.yaml          # Configuración entorno DEV
│   ├── qa/config.yaml           # Configuración entorno QA
│   └── production/config.yaml   # Configuración entorno Production
├── allowlist/
│   └── promotion-allowlist.yaml # Secretos autorizados para promoción
├── sync/
│   ├── config.go                # Carga de configuración
│   ├── types.go                 # Tipos de datos
│   ├── comparator.go            # Comparación de secretos
│   ├── reporter.go              # Reportes de diferencias
│   ├── retention.go             # Política de retención de versiones
│   ├── sync.go                  # Motor de sincronización
│   └── sync_test.go             # Pruebas unitarias
└── README.md                    # Este archivo
```

### Ejemplo de uso

```bash
# 1. Comparar secretos DEV vs QA (dry-run)
go run ./sync/cmd/sync-sync --source dev --target qa --dry-run

# 2. Revisar el reporte de diferencias generado
# 3. Aprobar promoción en GitHub Environment QA
# 4. Ejecutar sincronización real
go run ./sync/cmd/sync-sync --source dev --target qa --apply

# 5. Analizar versiones antiguas para limpieza
go run ./sync/cmd/sync-retention --project mr-training-backend --dry-run

# 6. Destruir versiones elegibles (requiere autorización)
go run ./sync/cmd/sync-retention --project mr-training-backend --apply
```

### Limitaciones conocidas

- Requiere Universal Auth configurado en Infisical para autenticación real
- Las pruebas unitarias comparan hashes sin valores reales
- La integración con GCP Secret Manager requiere Workload Identity Federation
- No se eliminan secretos completos automáticamente, solo versiones antiguas
- Production requiere autorización explícita para cualquier limpieza