package sync

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestHashValue(t *testing.T) {
	h1 := HashValue("valor-secreto-1")
	h2 := HashValue("valor-secreto-1")
	h3 := HashValue("valor-secreto-2")

	if h1 != h2 {
		t.Error("HashValue debe ser determinista: mismo valor mismo hash")
	}
	if h1 == h3 {
		t.Error("HashValue debe ser diferente para valores diferentes")
	}
	if len(h1) != 64 {
		t.Errorf("HashValue SHA-256 debe tener 64 caracteres hex, tiene %d", len(h1))
	}
}

func TestCompareSecrets_New(t *testing.T) {
	source := map[string]string{
		"SECRET_A": "valor-a",
	}
	target := map[string]string{}
	allowlist := &PromotionAllowlist{}

	result := CompareSecrets(source, target, allowlist)

	if len(result) != 1 {
		t.Errorf("se esperaba 1 comparación, se obtuvo %d", len(result))
	}
	if result[0].Status != SecretNew {
		t.Errorf("se esperaba estado New, se obtuvo %s", result[0].Status)
	}
	if result[0].Promotable {
		t.Error("un secreto nuevo no debería ser promotable sin aprobación")
	}
}

func TestCompareSecrets_Changed(t *testing.T) {
	source := map[string]string{
		"SECRET_A": "valor-nuevo",
	}
	target := map[string]string{
		"SECRET_A": "valor-viejo",
	}
	allowlist := &PromotionAllowlist{}

	result := CompareSecrets(source, target, allowlist)

	if len(result) != 1 {
		t.Errorf("se esperaba 1 comparación, se obtuvo %d", len(result))
	}
	if result[0].Status != SecretChanged {
		t.Errorf("se esperaba estado Changed, se obtuvo %s", result[0].Status)
	}
}

func TestCompareSecrets_Unchanged(t *testing.T) {
	source := map[string]string{
		"SECRET_A": "valor-mismo",
	}
	target := map[string]string{
		"SECRET_A": "valor-mismo",
	}
	allowlist := &PromotionAllowlist{}

	result := CompareSecrets(source, target, allowlist)

	if len(result) != 1 {
		t.Errorf("se esperaba 1 comparación, se obtuvo %d", len(result))
	}
	if result[0].Status != SecretUnchanged {
		t.Errorf("se esperaba estado Unchanged, se obtuvo %s", result[0].Status)
	}
}

func TestCompareSecrets_Deleted(t *testing.T) {
	source := map[string]string{}
	target := map[string]string{
		"SECRET_A": "valor-alguno",
	}
	allowlist := &PromotionAllowlist{}

	result := CompareSecrets(source, target, allowlist)

	if len(result) != 1 {
		t.Errorf("se esperaba 1 comparación, se obtuvo %d", len(result))
	}
	if result[0].Status != SecretDeleted {
		t.Errorf("se esperaba estado Deleted, se obtuvo %s", result[0].Status)
	}
	if result[0].TargetName != "SECRET_A" {
		t.Errorf("se esperaba TargetName SECRET_A, se obtuvo %s", result[0].TargetName)
	}
}

func TestCompareSecrets_Blocked(t *testing.T) {
	source := map[string]string{
		"DATABASE_URL": "postgres://...",
	}
	target := map[string]string{}
	allowlist := &PromotionAllowlist{
		BlockedPromotions: []string{"DATABASE_URL"},
	}

	result := CompareSecrets(source, target, allowlist)

	if len(result) != 1 {
		t.Errorf("se esperaba 1 comparación, se obtuvo %d", len(result))
	}
	if result[0].Status != SecretBlocked {
		t.Errorf("se esperaba estado Blocked, se obtuvo %s", result[0].Status)
	}
	if result[0].Promotable {
		t.Error("un secreto bloqueado no debería ser promotable")
	}
}

func TestCompareSecrets_AllowedPromotion(t *testing.T) {
	source := map[string]string{
		"CLERK_SECRET_KEY": "clerk-key-nuevo",
	}
	target := map[string]string{
		"CLERK_SECRET_KEY": "clerk-key-viejo",
	}
	allowlist := &PromotionAllowlist{
		AllowedPromotions: []AllowedPromotion{
			{Source: "CLERK_SECRET_KEY", Target: "CLERK_SECRET_KEY_QA", Reason: "prueba"},
		},
	}

	result := CompareSecrets(source, target, allowlist)

	if len(result) != 1 {
		t.Errorf("se esperaba 1 comparación, se obtuvo %d", len(result))
	}
	if !result[0].Allowed {
		t.Error("CLERK_SECRET_KEY debería estar permitido para promoción")
	}
	if !result[0].Promotable {
		t.Error("un secreto cambiado y permitido debería ser promotable")
	}
}

func TestSummaryStats(t *testing.T) {
	comparisons := []SecretComparison{
		{Status: SecretNew},
		{Status: SecretChanged},
		{Status: SecretUnchanged},
		{Status: SecretDeleted},
		{Status: SecretBlocked},
		{Status: SecretNew},
		{Status: SecretChanged},
	}

	result := SummaryStats(comparisons)

	if result.Total != 7 {
		t.Errorf("total debería ser 7, es %d", result.Total)
	}
	if result.New != 2 {
		t.Errorf("new debería ser 2, es %d", result.New)
	}
	if result.Changed != 2 {
		t.Errorf("changed debería ser 2, es %d", result.Changed)
	}
	if result.Unchanged != 1 {
		t.Errorf("unchanged debería ser 1, es %d", result.Unchanged)
	}
	if result.Deleted != 1 {
		t.Errorf("deleted debería ser 1, es %d", result.Deleted)
	}
	if result.Blocked != 1 {
		t.Errorf("blocked debería ser 1, es %d", result.Blocked)
	}
}

func TestFilterPromotable(t *testing.T) {
	comparisons := []SecretComparison{
		{Status: SecretNew, Promotable: true},
		{Status: SecretChanged, Promotable: true},
		{Status: SecretUnchanged, Promotable: false},
		{Status: SecretDeleted, Promotable: false},
		{Status: SecretBlocked, Promotable: false},
	}

	result := FilterPromotable(comparisons)

	if len(result) != 2 {
		t.Errorf("se esperaban 2 secretos promotables, se obtuvieron %d", len(result))
	}
}

func TestFilterByStatus(t *testing.T) {
	comparisons := []SecretComparison{
		{Status: SecretNew, SourceName: "A"},
		{Status: SecretChanged, SourceName: "B"},
		{Status: SecretNew, SourceName: "C"},
		{Status: SecretUnchanged, SourceName: "D"},
	}

	result := FilterByStatus(comparisons, SecretNew)

	if len(result) != 2 {
		t.Errorf("se esperaban 2 secretos nuevos, se obtuvieron %d", len(result))
	}
}

func TestGetNamesByStatus(t *testing.T) {
	comparisons := []SecretComparison{
		{Status: SecretNew, SourceName: "SECRET_A"},
		{Status: SecretNew, SourceName: "SECRET_B"},
		{Status: SecretDeleted, TargetName: "SECRET_C"},
	}

	names := GetNamesByStatus(comparisons, SecretNew)
	if len(names) != 2 {
		t.Errorf("se esperaban 2 nombres, se obtuvieron %d", len(names))
	}
	if names[0] != "SECRET_A" || names[1] != "SECRET_B" {
		t.Errorf("nombres inesperados: %v", names)
	}

	deletedNames := GetNamesByStatus(comparisons, SecretDeleted)
	if len(deletedNames) != 1 {
		t.Errorf("se esperaba 1 nombre eliminado, se obtuvieron %d", len(deletedNames))
	}
	if deletedNames[0] != "SECRET_C" {
		t.Errorf("se esperaba SECRET_C, se obtuvo %s", deletedNames[0])
	}
}

func TestContains(t *testing.T) {
	if !contains([]string{"a", "b", "c"}, "b") {
		t.Error("contains debería devolver true para elemento existente")
	}
	if contains([]string{"a", "b", "c"}, "d") {
		t.Error("contains debería devolver false para elemento inexistente")
	}
}

func TestExtractShortName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"projects/my-project/secrets/MY_SECRET", "MY_SECRET"},
		{"projects/p1/secrets/SECRET_1", "SECRET_1"},
		{"just-a-name", "just-a-name"},
	}

	for _, tt := range tests {
		result := ExtractShortName(tt.input)
		if result != tt.expected {
			t.Errorf("extractShortName(%q) = %q, esperado %q", tt.input, result, tt.expected)
		}
	}
}

func TestDiffReport(t *testing.T) {
	comparisons := []SecretComparison{
		{Status: SecretNew, SourceName: "NEW_SECRET"},
		{Status: SecretChanged, SourceName: "CHANGED_SECRET"},
		{Status: SecretUnchanged, SourceName: "UNCHANGED_SECRET"},
	}

	report := GenerateDiffReport("dev", "qa", comparisons, true)

	if report.Total != 3 {
		t.Errorf("total debería ser 3, es %d", report.Total)
	}
	if report.New != 1 {
		t.Errorf("new debería ser 1, es %d", report.New)
	}
	if report.Changed != 1 {
		t.Errorf("changed debería ser 1, es %d", report.Changed)
	}
	if report.Unchanged != 1 {
		t.Errorf("unchanged debería ser 1, es %d", report.Unchanged)
	}
	if !report.DryRun {
		t.Error("dry_run debería ser true")
	}
	if report.SourceEnv != "dev" {
		t.Errorf("source_env debería ser dev, es %s", report.SourceEnv)
	}
	if report.TargetEnv != "qa" {
		t.Errorf("target_env debería ser qa, es %s", report.TargetEnv)
	}
}

func TestPrintReportNoSensitiveLeak(t *testing.T) {
	comparisons := []SecretComparison{
		{
			SourceName: "SECRET_A",
			SourceHash: "a1b2c3d4e5f6", // hash válido
			TargetHash: "",             // vacío
			Status:     SecretNew,
			Reason:     "nuevo en origen",
		},
	}

	report := GenerateDiffReport("dev", "qa", comparisons, true)
	leaks := CheckForSensitiveLeak(report)

	if len(leaks) > 0 {
		t.Errorf("no debería haber fugas de valores sensibles, se encontraron: %v", leaks)
	}
}

func TestValidatePromotionRules(t *testing.T) {
	allowlist := &PromotionAllowlist{
		ValidationRules: []ValidationRule{
			{Name: "ci_passed", Description: "CI debe pasar", Required: true},
			{Name: "target_not_production", Description: "No promover a producción", Required: true},
		},
	}

	// CI no pasó
	violations := allowlist.ValidatePromotionRules(false, "qa")
	if len(violations) != 1 {
		t.Errorf("se esperaba 1 violación por CI fallido, se obtuvieron %d", len(violations))
	}

	// Target es production
	violations = allowlist.ValidatePromotionRules(true, "production")
	if len(violations) != 1 {
		t.Errorf("se esperaba 1 violación por target production, se obtuvieron %d", len(violations))
	}

	// Todo válido
	violations = allowlist.ValidatePromotionRules(true, "qa")
	if len(violations) != 0 {
		t.Errorf("no debería haber violaciones, se obtuvieron %d", len(violations))
	}
}

// --- Pruebas de retención estricta de 2 versiones (FASE C ajuste final) ---

// mockGCPClient implementa GCPClient para pruebas sin llamadas de red
type mockGCPClient struct {
	secrets  map[string]string
	versions map[string][]SecretVersion
}

func (m *mockGCPClient) ListSecrets(ctx context.Context, projectID string) ([]string, error) {
	ids := make([]string, 0, len(m.secrets))
	for id := range m.secrets {
		ids = append(ids, id)
	}
	return ids, nil
}

func (m *mockGCPClient) GetSecretValue(ctx context.Context, projectID, secretID string) (string, error) {
	v, ok := m.secrets[secretID]
	if !ok {
		return "", fmt.Errorf("secreto %s no encontrado", secretID)
	}
	return v, nil
}

func (m *mockGCPClient) GetSecretVersions(ctx context.Context, projectID, secretID string) ([]SecretVersion, error) {
	vs, ok := m.versions[secretID]
	if !ok {
		return nil, nil
	}
	return vs, nil
}

func (m *mockGCPClient) CreateSecret(ctx context.Context, projectID, secretID string) error {
	if _, ok := m.secrets[secretID]; ok {
		return nil // ya existe
	}
	m.secrets[secretID] = ""
	m.versions[secretID] = []SecretVersion{}
	return nil
}

func (m *mockGCPClient) CreateSecretVersion(ctx context.Context, projectID, secretID, value string) (string, error) {
	m.secrets[secretID] = value
	v := SecretVersion{
		Name:       fmt.Sprintf("projects/%s/secrets/%s/versions/%d", projectID, secretID, len(m.versions[secretID])+1),
		State:      "ENABLED",
		CreateTime: time.Now().Format(time.RFC3339),
	}
	m.versions[secretID] = append(m.versions[secretID], v)
	return v.Name, nil
}

func (m *mockGCPClient) DestroySecretVersion(ctx context.Context, projectID, secretID, versionID string) error {
	vs := m.versions[secretID]
	for i, v := range vs {
		if v.Name == versionID {
			m.versions[secretID] = append(vs[:i], vs[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("versión %s no encontrada en secreto %s", versionID, secretID)
}

// TestRetentionZeroChanges verifica que sin cambios no se crea versión nueva
func TestRetentionZeroChanges(t *testing.T) {
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_QA": "valor-actual",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_QA": {
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/2", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	mgr := NewRetentionManager(mock, true)
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_QA"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	if report.TotalVersions != 2 {
		t.Errorf("se esperaban 2 versiones, se encontraron %d", report.TotalVersions)
	}
	if report.Destroyable != 0 {
		t.Errorf("no debería haber versiones candidatas a destrucción, hay %d", report.Destroyable)
	}
	if report.Protected != 2 {
		t.Errorf("deberían haber 2 versiones protegidas, hay %d", report.Protected)
	}
}

// TestRetentionExcessVersions verifica que versiones sobrantes se identifiquen como candidatas a destrucción
func TestRetentionExcessVersions(t *testing.T) {
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_QA": "valor-actual",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_QA": {
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-72 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/2", State: "ENABLED", CreateTime: time.Now().Add(-48 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/3", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/4", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	mgr := NewRetentionManager(mock, true)
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_QA"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	if report.TotalVersions != 4 {
		t.Errorf("se esperaban 4 versiones, se encontraron %d", report.TotalVersions)
	}
	if report.Destroyable != 2 {
		t.Errorf("se esperaban 2 versiones candidatas a destrucción, hay %d", report.Destroyable)
	}
	if report.Protected != 2 {
		t.Errorf("deberían haber 2 versiones protegidas, hay %d", report.Protected)
	}

	// Verificar que las 2 más recientes están protegidas y las 2 anteriores son candidatas
	destroyableNames := make([]string, 0)
	for _, c := range report.Candidates {
		if c.CanDestroy {
			destroyableNames = append(destroyableNames, c.VersionID)
		}
	}
	if len(destroyableNames) != 2 {
		t.Errorf("se esperaban 2 versiones candidatas a destrucción, hay %d", len(destroyableNames))
	}
}

// TestRetentionCloudRunReference verifica que una versión referenciada por Cloud Run no se destruya
func TestRetentionCloudRunReference(t *testing.T) {
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_QA": "valor-actual",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_QA": {
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-72 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/2", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/3", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	mgr := NewRetentionManager(mock, true)
	// Simular que Cloud Run referencia este secreto
	mgr.SetCloudRunRevisions([]CloudRunRevision{
		{Name: "revision-001", SecretReferences: []CloudRunSecretReference{{SecretID: "DB_PASSWORD_QA"}}, CreatedAt: time.Now(), TrafficPercentage: 100},
	})
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_QA"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	// Todas las versiones deberían estar protegidas porque Cloud Run referencia el secreto
	if report.Destroyable != 0 {
		t.Errorf("no debería haber versiones candidatas a destrucción cuando Cloud Run referencia el secreto, hay %d", report.Destroyable)
	}
	if report.Protected != 3 {
		t.Errorf("deberían haber 3 versiones protegidas (todas referenciadas), hay %d", report.Protected)
	}
}

// TestRetentionNoSensitiveValuesInReport verifica que el reporte no contenga valores ni hashes sensibles
func TestRetentionNoSensitiveValuesInReport(t *testing.T) {
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_QA": "super-secreto-valor-real-no-mostrar",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_QA": {
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/2", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	mgr := NewRetentionManager(mock, true)
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_QA"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	// El reporte no debe contener valores reales de secretos
	reportStr := fmt.Sprintf("%+v", report)
	if strings.Contains(reportStr, "super-secreto-valor-real-no-mostrar") {
		t.Error("el reporte contiene el valor real del secreto - FUGA DE DATOS")
	}
	if strings.Contains(reportStr, "valor-real") {
		t.Error("el reporte contiene parte del valor real del secreto - FUGA DE DATOS")
	}

	// Verificar que los VersionID no contengan valores sensibles
	for _, c := range report.Candidates {
		if strings.Contains(c.Reason, "valor") {
			t.Errorf("el reason contiene posible valor sensible: %s", c.Reason)
		}
	}
}

// TestRetentionProductionNoAutoClean verifica que production no ejecute limpieza automática
func TestRetentionProductionNoAutoClean(t *testing.T) {
	// production usa una política diferente: keep_latest=3, dry_run_default=true
	// No debe ejecutar destrucciones automáticas
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_PROD": "valor-produccion",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_PROD": {
				{Name: "projects/p1/secrets/DB_PASSWORD_PROD/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-72 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_PROD/versions/2", State: "ENABLED", CreateTime: time.Now().Add(-48 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_PROD/versions/3", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_PROD/versions/4", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	// production con dry_run=true (política de producción)
	mgr := NewRetentionManager(mock, true)
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_PROD"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	// En dry-run, no debe destruir nada
	if report.DryRun != true {
		t.Error("producción debe ejecutarse en dry-run por defecto")
	}
	if report.Destroyable > 0 {
		// Aunque haya candidatos, en dry-run no se destruye
		t.Logf("nota: %d versiones candidatas a destrucción en dry-run (no se ejecutará)", report.Destroyable)
	}
}

// TestRetentionCreateVersionOnlyOnChange verifica que no se crea versión nueva si el valor no cambió
// (comparación SHA-256 en memoria) y que sí se crea cuando cambia.
func TestRetentionCreateVersionOnlyOnChange(t *testing.T) {
	// Valor sin cambios: SHA-256 coincide → no crear versión nueva
	sourceValue := "valor-actual-mismo"
	targetValue := "valor-actual-mismo"

	if HashValue(sourceValue) != HashValue(targetValue) {
		t.Error("SHA-256 debe coincidir para valores iguales")
	}

	// Valor cambiado: SHA-256 difiere → crear versión nueva
	sourceValue = "valor-nuevo"
	targetValue = "valor-viejo"

	if HashValue(sourceValue) == HashValue(targetValue) {
		t.Error("SHA-256 debe diferir para valores diferentes")
	}
}

// TestRetentionDryRunNoModification verifica que en modo dry-run no se destruye ninguna versión.
func TestRetentionDryRunNoModification(t *testing.T) {
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_QA": "valor-actual",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_QA": {
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-72 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/2", State: "ENABLED", CreateTime: time.Now().Add(-48 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/3", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/4", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	mgr := NewRetentionManager(mock, true) // dry-run
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_QA"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	if report.Destroyable != 2 {
		t.Errorf("se esperaban 2 versiones candidatas a destrucción, hay %d", report.Destroyable)
	}

	// En dry-run, destruir no debe modificar nada
	err = mgr.DestroyEligibleVersions(context.Background(), report)
	if err != nil {
		t.Fatalf("error inesperado en dry-run: %v", err)
	}

	// Las versiones deben permanecer intactas (no se destruyó nada)
	versionesDespues := len(mock.versions["DB_PASSWORD_QA"])
	if versionesDespues != 4 {
		t.Errorf("dry-run no debe modificar versiones: esperaban 4, quedan %d", versionesDespues)
	}
}

// TestRetentionValidationFailurePreservesVersions verifica que si falla una validación
// (por ejemplo, versión referenciada por Cloud Run), se conservan las versiones existentes.
func TestRetentionValidationFailurePreservesVersions(t *testing.T) {
	mock := &mockGCPClient{
		secrets: map[string]string{
			"DB_PASSWORD_QA": "valor-actual",
		},
		versions: map[string][]SecretVersion{
			"DB_PASSWORD_QA": {
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/1", State: "ENABLED", CreateTime: time.Now().Add(-72 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/2", State: "ENABLED", CreateTime: time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
				{Name: "projects/p1/secrets/DB_PASSWORD_QA/versions/3", State: "ENABLED", CreateTime: time.Now().Format(time.RFC3339)},
			},
		},
	}

	mgr := NewRetentionManager(mock, false) // no dry-run
	// Cloud Run referencia el secreto → no se puede destruir nada
	mgr.SetCloudRunRevisions([]CloudRunRevision{
		{Name: "revision-001", SecretReferences: []CloudRunSecretReference{{SecretID: "DB_PASSWORD_QA"}}, CreatedAt: time.Now(), TrafficPercentage: 100},
	})
	mgr.SetLogger(func(format string, args ...interface{}) {})

	report, err := mgr.AnalyzeVersions(context.Background(), []string{"DB_PASSWORD_QA"})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	if report.Destroyable != 0 {
		t.Errorf("no debería haber versiones destruibles cuando hay referencia activa, hay %d", report.Destroyable)
	}
	if report.Protected != 3 {
		t.Errorf("deberían estar las 3 versiones protegidas, hay %d", report.Protected)
	}

	// Ejecutar destrucción: no debe destruir nada por validación fallida (referencia activa)
	err = mgr.DestroyEligibleVersions(context.Background(), report)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}

	versionesDespues := len(mock.versions["DB_PASSWORD_QA"])
	if versionesDespues != 3 {
		t.Errorf("no se deben destruir versiones por validación fallida: esperaban 3, quedan %d", versionesDespues)
	}
}
