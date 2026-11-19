package sync

import (
	"fmt"
	"strings"
	"time"
)

// GenerateDiffReport crea un reporte de diferencias a partir de comparaciones
func GenerateDiffReport(sourceEnv, targetEnv string, comparisons []SecretComparison, dryRun bool) *DiffReport {
	stats := SummaryStats(comparisons)
	promotable := FilterPromotable(comparisons)

	report := &DiffReport{
		GeneratedAt: time.Now(),
		SourceEnv:   sourceEnv,
		TargetEnv:   targetEnv,
		Total:       stats.Total,
		New:         stats.New,
		Changed:     stats.Changed,
		Unchanged:   stats.Unchanged,
		Deleted:     stats.Deleted,
		Blocked:     stats.Blocked,
		Promotable:  len(promotable),
		Comparisons: comparisons,
		DryRun:      dryRun,
	}

	// Generar plan de promoción solo para secretos promocionables
	for _, c := range promotable {
		report.PromotionPlan = append(report.PromotionPlan, PromotionPlanItem{
			SourceName: c.SourceName,
			TargetName: c.TargetName,
			Status:     string(c.Status),
			Reason:     c.Reason,
			Allowed:    c.Allowed,
		})
	}

	return report
}

// PrintReport imprime el reporte en consola sin exponer valores sensibles
func PrintReport(report *DiffReport) {
	fmt.Println("============================================================")
	fmt.Println("  REPORTE DE DIFERENCIAS DE SECRETOS")
	fmt.Println("============================================================")
	fmt.Printf("  Generado: %s\n", report.GeneratedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("  Origen:   %s\n", report.SourceEnv)
	fmt.Printf("  Destino:  %s\n", report.TargetEnv)
	fmt.Printf("  Dry-run:  %v\n", report.DryRun)
	fmt.Println("------------------------------------------------------------")
	fmt.Printf("  Total evaluados:    %d\n", report.Total)
	fmt.Printf("  Nuevos:             %d\n", report.New)
	fmt.Printf("  Modificados:        %d\n", report.Changed)
	fmt.Printf("  Sin cambios:        %d\n", report.Unchanged)
	fmt.Printf("  Eliminados:         %d\n", report.Deleted)
	fmt.Printf("  Bloqueados:         %d\n", report.Blocked)
	fmt.Printf("  Promocionables:     %d\n", report.Promotable)
	fmt.Println("============================================================")

	// Imprimir secretos nuevos
	if len(report.Comparisons) > 0 {
		fmt.Println("\n  DETALLE POR SECRETO:")
		fmt.Println("  ------------------------------------------------------------")
		for _, c := range report.Comparisons {
			statusIcon := getStatusIcon(c.Status)
			// En status deleted el nombre vive en TargetName (SourceName está vacío)
			displayName := c.SourceName
			if displayName == "" {
				displayName = c.TargetName
			}
			fmt.Printf("  %s %-30s | %-12s | %-40s\n",
				statusIcon,
				displayName,
				string(c.Status),
				c.Reason)
			// El aviso de allowlist solo aplica a secretos que se promoverían
			if !c.Allowed && (c.Status == SecretNew || c.Status == SecretChanged) {
				fmt.Printf("      ^ No permitido para promoción (no está en allowlist)\n")
			}
			if c.Status == SecretBlocked {
				fmt.Printf("      ^ BLOQUEADO: %s\n", c.Reason)
			}
		}
	}

	// Imprimir plan de promoción
	if len(report.PromotionPlan) > 0 {
		fmt.Println("\n  PLAN DE PROMOCIÓN (secretos aprobados para promover):")
		fmt.Println("  ------------------------------------------------------------")
		for _, p := range report.PromotionPlan {
			fmt.Printf("  %-30s -> %-30s (%s)\n", p.SourceName, p.TargetName, p.Reason)
		}
		if report.DryRun {
			fmt.Println("\n  ¡MODO DRY-RUN! No se realizarán cambios reales.")
		}
	}

	fmt.Println("============================================================")
}

// getStatusIcon devuelve un icono representativo del estado
func getStatusIcon(status SecretStatus) string {
	switch status {
	case SecretNew:
		return "[+]"
	case SecretChanged:
		return "[~]"
	case SecretUnchanged:
		return "[=]"
	case SecretDeleted:
		return "[-]"
	case SecretBlocked:
		return "[X]"
	default:
		return "[?]"
	}
}

// WriteJSONReport escribe el reporte en formato JSON a un archivo
func WriteJSONReport(report *DiffReport, path string) error {
	// Usar fmt.Sprintf para serialización simple sin dependencias externas
	// En producción se usaría encoding/json
	return fmt.Errorf("JSON report writing not implemented - use PrintReport for console output")
}

// PrintSummary imprime un resumen breve
func PrintSummary(report *DiffReport) {
	fmt.Printf("Resumen: %d total, %d nuevos, %d modificados, %d sin cambios, %d eliminados, %d bloqueados, %d promocionables\n",
		report.Total, report.New, report.Changed, report.Unchanged, report.Deleted, report.Blocked, report.Promotable)
}

// CheckForSensitiveLeak verifica que no haya valores reales expuestos en el reporte
func CheckForSensitiveLeak(report *DiffReport) []string {
	var leaks []string

	for _, c := range report.Comparisons {
		// Verificar que SourceHash y TargetHash no sean valores vacíos que podrían ser los valores reales
		if len(c.SourceHash) < 8 && c.SourceHash != "" {
			leaks = append(leaks, fmt.Sprintf("posible valor expuesto en SourceHash para %s", c.SourceName))
		}
		if len(c.TargetHash) < 8 && c.TargetHash != "" {
			leaks = append(leaks, fmt.Sprintf("posible valor expuesto en TargetHash para %s", c.TargetName))
		}
		// Verificar que Reason no contenga valores (solo descripciones)
		if strings.Contains(c.Reason, "=") && len(c.Reason) > 50 {
			leaks = append(leaks, fmt.Sprintf("posible valor en Reason para %s", c.SourceName))
		}
	}

	return leaks
}
