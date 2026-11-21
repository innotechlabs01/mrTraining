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
	dryRun := flag.Bool("dry-run", true, "Modo dry-run")
	flag.Parse()

	if *projectID == "" {
		fmt.Println("❌ Se requiere --project")
		os.Exit(1)
	}

	ctx := context.Background()

	gcpClient, err := sync.NewGCPClient(ctx)
	if err != nil {
		fmt.Printf("❌ Error creando cliente GCP: %v\n", err)
		os.Exit(1)
	}

	manager := sync.NewRetentionManager(gcpClient, *dryRun)
	manager.SetLogger(func(format string, args ...interface{}) {
		fmt.Printf(format+"\n", args...)
	})

	allSecrets, err := gcpClient.ListSecrets(ctx, *projectID)
	if err != nil {
		fmt.Printf("❌ Error listando secretos: %v\n", err)
		os.Exit(1)
	}

	var qaSecrets []string
	for _, s := range allSecrets {
		if len(s) > 3 && s[len(s)-3:] == "_QA" {
			qaSecrets = append(qaSecrets, s)
		}
	}

	report, err := manager.AnalyzeVersions(ctx, qaSecrets)
	if err != nil {
		fmt.Printf("❌ Error analizando versiones: %v\n", err)
		os.Exit(1)
	}

	report.ProjectID = *projectID
	report.PrintReport()

	if *dryRun {
		fmt.Println("\n🔍 Modo dry-run. Para destruir versiones, use --apply en sync-retention")
	}
}
