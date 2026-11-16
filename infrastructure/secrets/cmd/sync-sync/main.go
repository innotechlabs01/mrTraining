package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/innotechlabs01/mr-training-secrets/sync"
)

func main() {
	sourceEnv := flag.String("source", "dev", "Entorno origen (dev, qa, production)")
	targetEnv := flag.String("target", "qa", "Entorno destino (dev, qa, production)")
	dryRun := flag.Bool("dry-run", true, "Ejecutar en modo dry-run (no realiza cambios reales)")
	apply := flag.Bool("apply", false, "Aplicar cambios reales (desactiva dry-run)")
	ciPassed := flag.Bool("ci-passed", false, "Indica si CI ha pasado exitosamente")
	flag.Parse()

	// Determinar modo dry-run
	isDryRun := *dryRun && !*apply
	if *apply {
		isDryRun = false
		fmt.Println("⚠️  MODO APLICAR: Se realizarán cambios reales")
	} else {
		fmt.Println("🔍 MODO DRY-RUN: No se realizarán cambios reales")
	}

	// Cargar configuración de entornos
	sourceCfg, err := sync.LoadEnvironmentConfig(*sourceEnv)
	if err != nil {
		fmt.Printf("❌ Error cargando configuración origen %s: %v\n", *sourceEnv, err)
		os.Exit(1)
	}

	targetCfg, err := sync.LoadEnvironmentConfig(*targetEnv)
	if err != nil {
		fmt.Printf("❌ Error cargando configuración destino %s: %v\n", *targetEnv, err)
		os.Exit(1)
	}

	// Cargar allowlist de promoción
	allowlist, err := sync.LoadPromotionAllowlist()
	if err != nil {
		fmt.Printf("❌ Error cargando allowlist: %v\n", err)
		os.Exit(1)
	}

	// Crear clientes
	ctx := context.Background()

	infisicalClient := sync.NewInfisicalClient(
		sourceCfg.Infisical.BaseURL,
		os.Getenv("INFISICAL_CLIENT_ID"),
		os.Getenv("INFISICAL_CLIENT_SECRET"),
	)

	gcpClient, err := sync.NewGCPClient(ctx)
	if err != nil {
		fmt.Printf("❌ Error creando cliente GCP Secret Manager: %v\n", err)
		os.Exit(1)
	}

	// Crear motor de sincronización
	engine := sync.NewSyncEngine(infisicalClient, gcpClient, allowlist, isDryRun)
	engine.SetLogger(func(format string, args ...interface{}) {
		fmt.Printf(format+"\n", args...)
	})

	// Ejecutar sincronización
	result, report, err := engine.Sync(ctx, sourceCfg, targetCfg, *ciPassed)
	if err != nil {
		fmt.Printf("❌ Error en sincronización: %v\n", err)
		os.Exit(1)
	}

	// Imprimir reporte
	sync.PrintReport(report)

	// Verificar que no haya fugas de valores sensibles
	leaks := sync.CheckForSensitiveLeak(report)
	if len(leaks) > 0 {
		fmt.Println("\n⚠️  ADVERTENCIA: Posibles fugas de valores sensibles detectadas:")
		for _, leak := range leaks {
			fmt.Printf("   - %s\n", leak)
		}
		os.Exit(1)
	}

	// Resumen final
	fmt.Printf("\n✅ Sincronización completada: %d nuevos, %d modificados, %d sin cambios\n",
		result.New, result.Changed, result.Unchanged)

	if len(result.Errors) > 0 {
		fmt.Printf("⚠️  %d errores durante la sincronización:\n", len(result.Errors))
		for _, e := range result.Errors {
			fmt.Printf("   - %s: %s\n", e.SecretName, e.Error)
		}
		os.Exit(1)
	}

	if isDryRun {
		fmt.Println("\n🔍 Esto fue un dry-run. Para aplicar cambios reales, use --apply")
	}
}
