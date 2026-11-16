package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/innotechlabs01/mr-training-secrets/sync"
)

func main() {
	sourceEnv := flag.String("source", "dev", "Entorno origen")
	targetEnv := flag.String("target", "qa", "Entorno destino")
	dryRun := flag.Bool("dry-run", true, "Modo dry-run")
	flag.Parse()

	// Cargar configuraciones
	sourceCfg, err := sync.LoadEnvironmentConfig(*sourceEnv)
	if err != nil {
		fmt.Printf("❌ Error cargando configuración origen: %v\n", err)
		os.Exit(1)
	}

	targetCfg, err := sync.LoadEnvironmentConfig(*targetEnv)
	if err != nil {
		fmt.Printf("❌ Error cargando configuración destino: %v\n", err)
		os.Exit(1)
	}

	allowlist, err := sync.LoadPromotionAllowlist()
	if err != nil {
		fmt.Printf("❌ Error cargando allowlist: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()

	infisicalClient := sync.NewInfisicalClient(
		sourceCfg.Infisical.BaseURL,
		os.Getenv("INFISICAL_CLIENT_ID"),
		os.Getenv("INFISICAL_CLIENT_SECRET"),
	)

	gcpClient, err := sync.NewGCPClient(ctx)
	if err != nil {
		fmt.Printf("❌ Error creando cliente GCP: %v\n", err)
		os.Exit(1)
	}

	// Obtener secretos de ambos entornos
	sourceNames, err := infisicalClient.GetSecretNames(ctx, sourceCfg.GoogleSecretManager.ProjectID, sourceCfg.Infisical.Environment, sourceCfg.Infisical.SecretPath)
	if err != nil {
		fmt.Printf("❌ Error obteniendo secretos de Infisical: %v\n", err)
		os.Exit(1)
	}

	sourceSecrets := make(map[string]string)
	for _, name := range sourceNames {
		value, err := infisicalClient.GetSecretValue(ctx, sourceCfg.GoogleSecretManager.ProjectID, sourceCfg.Infisical.Environment, sourceCfg.Infisical.SecretPath, name)
		if err != nil {
			continue // Saltar secretos que no se pueden leer
		}
		sourceSecrets[name] = value
	}

	gcpNames, err := gcpClient.ListSecrets(ctx, targetCfg.GoogleSecretManager.ProjectID)
	if err != nil {
		fmt.Printf("❌ Error listando secretos de GCP: %v\n", err)
		os.Exit(1)
	}

	gcpSecrets := make(map[string]string)
	for _, shortName := range gcpNames {
		value, err := gcpClient.GetSecretValue(ctx, targetCfg.GoogleSecretManager.ProjectID, shortName)
		if err != nil {
			continue
		}
		gcpSecrets[shortName] = value
	}

	// Comparar
	comparisons := sync.CompareSecrets(sourceSecrets, gcpSecrets, allowlist)
	report := sync.GenerateDiffReport(sourceCfg.Environment.Name, targetCfg.Environment.Name, comparisons, *dryRun)

	sync.PrintReport(report)

	// Verificar fugas
	leaks := sync.CheckForSensitiveLeak(report)
	if len(leaks) > 0 {
		fmt.Println("\n⚠️  Posibles fugas de valores sensibles:")
		for _, leak := range leaks {
			fmt.Printf("   - %s\n", leak)
		}
		os.Exit(1)
	}

	if *dryRun {
		fmt.Println("\n🔍 Modo dry-run. Para aplicar, use --apply en sync-sync")
	}
}
