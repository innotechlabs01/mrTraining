package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/innotechlabs01/mr-training-secrets/sync"
)

func main() {
	projectID := flag.String("project", "", "ID del proyecto GCP")
	dryRun := flag.Bool("dry-run", true, "Ejecutar en modo dry-run (no destruye versiones)")
	apply := flag.Bool("apply", false, "Aplicar destrucción de versiones (desactiva dry-run)")
	flag.Parse()

	if *projectID == "" {
		fmt.Println("❌ Se requiere --project (ID del proyecto GCP)")
		os.Exit(1)
	}

	isDryRun := *dryRun && !*apply
	if *apply {
		isDryRun = false
		fmt.Println("⚠️  MODO APLICAR: Se destruirán versiones elegibles")
	} else {
		fmt.Println("🔍 MODO DRY-RUN: No se destruirán versiones")
	}

	ctx := context.Background()

	gcpClient, err := sync.NewGCPClient(ctx)
	if err != nil {
		fmt.Printf("❌ Error creando cliente GCP Secret Manager: %v\n", err)
		os.Exit(1)
	}

	// Cargar política de retención desde configuración QA
	retentionCfg, err := sync.LoadEnvironmentConfig("qa")
	if err != nil {
		fmt.Printf("❌ Error cargando configuración de retención: %v\n", err)
		os.Exit(1)
	}

	// Si hay configuración de retención en el archivo, usarla
	_ = retentionCfg // TODO: Leer version_retention del config.yaml

	// Crear gestor de retención
	manager := sync.NewRetentionManager(gcpClient, isDryRun)
	manager.SetLogger(func(format string, args ...interface{}) {
		fmt.Printf(format+"\n", args...)
	})

	// Obtener lista de secretos (filtrando solo los QA)
	allSecrets, err := gcpClient.ListSecrets(ctx, *projectID)
	if err != nil {
		fmt.Printf("❌ Error listando secretos: %v\n", err)
		os.Exit(1)
	}

	// Filtrar solo secretos QA (terminan en _QA)
	var qaSecrets []string
	for _, shortName := range allSecrets {
		if len(shortName) > 3 && shortName[len(shortName)-3:] == "_QA" {
			qaSecrets = append(qaSecrets, shortName)
		}
	}

	fmt.Printf("  Encontrados %d secretos QA\n", len(qaSecrets))

	// Analizar versiones
	report, err := manager.AnalyzeVersions(ctx, qaSecrets)
	if err != nil {
		fmt.Printf("❌ Error analizando versiones: %v\n", err)
		os.Exit(1)
	}

	report.ProjectID = *projectID
	report.PrintReport()

	if isDryRun {
		fmt.Println("\n🔍 Esto fue un dry-run. Para destruir versiones, use --apply")
	} else {
		// Destruir versiones elegibles
		err := manager.DestroyEligibleVersions(ctx, report)
		if err != nil {
			fmt.Printf("❌ Error destruyendo versiones: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("✅ Limpieza de versiones completada")
	}
}
