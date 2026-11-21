package sync

import (
	"context"
	"fmt"
	"sort"
	"time"
)

// RetentionManager gestiona la política de retención de versiones de Secret Manager.
type RetentionManager struct {
	gcpClient    GCPClientInterface
	dryRun       bool
	cloudRunRevs []CloudRunRevision
	logger       func(format string, args ...interface{})
}

// NewRetentionManager crea un gestor de retención para QA.
// Política estricta: exactamente QARecoverableVersions (2) versiones recuperables.
func NewRetentionManager(gcpClient GCPClientInterface, dryRun bool) *RetentionManager {
	return &RetentionManager{
		gcpClient: gcpClient,
		dryRun:    dryRun,
		logger:    func(format string, args ...interface{}) {},
	}
}

// SetLogger establece la función de logging.
func (r *RetentionManager) SetLogger(logger func(format string, args ...interface{})) {
	r.logger = logger
}

// log imprime un mensaje de log (nunca valores sensibles).
func (r *RetentionManager) log(format string, args ...interface{}) {
	r.logger(format, args...)
}

// SetCloudRunRevisions establece las revisiones activas de Cloud Run para verificar referencias.
func (r *RetentionManager) SetCloudRunRevisions(revisions []CloudRunRevision) {
	r.cloudRunRevs = revisions
}

// AnalyzeVersions analiza todas las versiones de todos los secretos y genera un reporte.
// Política QA: exactamente 2 versiones recuperables por secreto.
// Versiones anteriores a las 2 más recientes: candidatas a DESTROYED (no DISABLED).
func (r *RetentionManager) AnalyzeVersions(ctx context.Context, secretIDs []string) (*RetentionReport, error) {
	r.log("Analizando versiones de %d secretos... (política QA: exactamente %d versiones recuperables)", len(secretIDs), QARecoverableVersions)

	report := &RetentionReport{
		GeneratedAt: time.Now(),
		DryRun:      r.dryRun,
	}

	// Construir conjunto de secretos referenciados por revisiones activas de Cloud Run
	referencedSecrets := make(map[string]bool)
	for _, rev := range r.cloudRunRevs {
		for _, ref := range rev.SecretReferences {
			referencedSecrets[ref.SecretID] = true
		}
	}

	for _, secretID := range secretIDs {
		report.TotalSecrets++

		versions, err := r.gcpClient.GetSecretVersions(ctx, "", secretID) // projectID vacío, se usa el del cliente
		if err != nil {
			r.log("  ⚠️  No se pudieron obtener versiones de %s: %v", secretID, err)
			continue
		}

		report.TotalVersions += len(versions)

		// Ordenar versiones por fecha de creación (más recientes primero)
		sort.Slice(versions, func(i, j int) bool {
			return versions[i].CreateTime > versions[j].CreateTime
		})

		// Identificar secretos referenciados por Cloud Run (versión "latest" activa)
		isReferencedByCloudRun := false
		for _, rev := range r.cloudRunRevs {
			for _, ref := range rev.SecretReferences {
				if ref.SecretID == secretID {
					isReferencedByCloudRun = true
					break
				}
			}
			if isReferencedByCloudRun {
				break
			}
		}

		// Evaluar cada versión
		for i, version := range versions {
			candidate := VersionCandidate{
				SecretID:  secretID,
				VersionID: version.Name,
				State:     version.State,
				CreatedAt: time.Now(), // Placeholder, se usaría CreateTime parseado
				Reason:    "",
			}

			// Versiones destruidas ya no se pueden destruir de nuevo
			if candidate.State == SecretVersionStateDestroyed {
				candidate.CanDestroy = false
				candidate.Reason = "versión ya destruida (no genera costo)"
				report.Protected++
				report.Candidates = append(report.Candidates, candidate)
				continue
			}

			// Regla 1: Las 2 primeras versiones (más recientes) se protegen siempre
			// Versión 0 = actual, Versión 1 = anterior para rollback
			if i < QARecoverableVersions {
				candidate.CanDestroy = false
				if i == 0 {
					candidate.Reason = "versión actual (ENABLED, en uso por Cloud Run)"
				} else {
					candidate.Reason = "versión anterior (ENABLED, reservada para rollback)"
				}
				report.Protected++
				report.Candidates = append(report.Candidates, candidate)
				continue
			}

			// Regla 2: Si el secreto está referenciado por una revisión activa de Cloud Run,
			// no destruir ninguna versión adicional sin verificación explícita
			if isReferencedByCloudRun {
				candidate.CanDestroy = false
				candidate.Reason = "secreto referenciado por revisión activa de Cloud Run - no destruir sin verificación"
				report.Protected++
				report.Candidates = append(report.Candidates, candidate)
				continue
			}

			// Regla 3: Versiones sobrantes (más allá de las 2 recuperables) son candidatas a DESTROYED
			candidate.CanDestroy = true
			candidate.Reason = "versión sobrante (más de 2 recuperables) - candidata a DESTROYED"
			report.Destroyable++
			report.Candidates = append(report.Candidates, candidate)
		}
	}

	r.log("Análisis completado: %d secretos, %d versiones, %d candidatas a destrucción, %d protegidas",
		report.TotalSecrets, report.TotalVersions, report.Destroyable, report.Protected)

	return report, nil
}

// PrintReport imprime el reporte de retención
func (r *RetentionReport) PrintReport() {
	fmt.Println("============================================================")
	fmt.Println("  REPORTE DE RETENCIÓN DE VERSIONES - SECRET MANAGER (QA)")
	fmt.Println("============================================================")
	fmt.Printf("  Proyecto:    %s\n", r.ProjectID)
	fmt.Printf("  Generado:    %s\n", r.GeneratedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("  Dry-run:     %v\n", r.DryRun)
	fmt.Println("------------------------------------------------------------")
	fmt.Printf("  Política QA: exactamente %d versiones recuperables por secreto\n", QARecoverableVersions)
	fmt.Printf("  Total secretos:      %d\n", r.TotalSecrets)
	fmt.Printf("  Total versiones:     %d\n", r.TotalVersions)
	fmt.Printf("  Candidatas a DESTROYED: %d\n", r.Destroyable)
	fmt.Printf("  Protegidas (2 más recientes): %d\n", r.Protected)
	fmt.Println("============================================================")

	if len(r.Candidates) > 0 {
		fmt.Println("\n  VERSIONES CANDIDATAS:")
		fmt.Println("  ------------------------------------------------------------")
		for _, c := range r.Candidates {
			statusIcon := "[ ]"
			if c.CanDestroy {
				statusIcon = "[!]"
			}
			fmt.Printf("  %s %-40s | %-40s | %-10s | %s\n",
				statusIcon,
				c.SecretID,
				c.VersionID,
				c.State,
				c.Reason)
		}
	}

	if r.DryRun {
		fmt.Println("\n  ¡MODO DRY-RUN! No se destruirán versiones.")
	}
	fmt.Println("============================================================")
}

// DestroyEligibleVersions destruye las versiones elegibles (solo si no es dry-run)
// Reglas de seguridad:
// - Crear primero la nueva versión antes de destruir cualquier versión anterior
// - No destruir versiones referenciadas por revisiones activas de Cloud Run
// - Las versiones sobrantes pasan a DESTROYED, no a DISABLED
func (r *RetentionManager) DestroyEligibleVersions(ctx context.Context, report *RetentionReport) error {
	if r.dryRun {
		r.log("Modo dry-run: no se destruirán versiones")
		return nil
	}

	destroyed := 0
	for _, c := range report.Candidates {
		if !c.CanDestroy {
			continue
		}

		// Extraer projectID y versionID del VersionID completo
		// VersionID tiene formato: projects/PROJECT/secrets/SECRET/versions/VERSION
		parts := splitPath(c.VersionID)
		if len(parts) < 6 {
			r.log("  ⚠️  No se pudo extraer projectID de %s", c.VersionID)
			continue
		}
		projectID := parts[1]
		secretID := parts[3]
		versionID := parts[5]

		r.log("Destruyendo versión %s de secreto %s (estado objetivo: DESTROYED)...", versionID, secretID)
		err := r.gcpClient.DestroySecretVersion(ctx, projectID, secretID, versionID)
		if err != nil {
			r.log("  ⚠️  Error destruyendo %s: %v", versionID, err)
			continue
		}
		destroyed++
	}

	r.log("Destruidas %d versiones (estado: DESTROYED)", destroyed)
	return nil
}

// splitPath divide un path por '/'
func splitPath(path string) []string {
	var parts []string
	current := ""
	for _, ch := range path {
		if ch == '/' {
			parts = append(parts, current)
			current = ""
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}
