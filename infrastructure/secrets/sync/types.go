package sync

import (
	"context"
	"time"
)

// Estados de una versión en Google Secret Manager.
// Fuente: diccionario SecretVersion de la API v1.
const (
	SecretVersionStateEnabled     = "ENABLED"
	SecretVersionStateDisabled    = "DISABLED"
	SecretVersionStateDestroyed   = "DESTROYED"
	SecretVersionStateDestroying  = "DESTROYING"
	SecretVersionStateUnspecified = "STATE_UNSPECIFIED"
)

// QARecoverableVersions es el límite estricto de versiones recuperables en QA:
// la versión actual y la inmediatamente anterior, ambas ENABLED para rollback.
const QARecoverableVersions = 2

// SecretManagerClient define las operaciones mínimas usadas contra
// Google Secret Manager. Los valores secretos sólo se manejan en memoria.
type SecretManagerClient interface {
	ListSecrets(ctx context.Context, projectID string) ([]string, error)
	GetSecretValue(ctx context.Context, projectID, secretID string) (string, error)
	GetSecretVersions(ctx context.Context, projectID, secretID string) ([]SecretVersion, error)
	AccessSecretVersion(ctx context.Context, projectID, secretID, version string) (string, error)
	CreateSecret(ctx context.Context, projectID, secretID string) error
	CreateSecretVersion(ctx context.Context, projectID, secretID, value string) (string, error)
	DestroySecretVersion(ctx context.Context, projectID, secretID, versionID string) error
}

// GCPClientInterface es la interfaz mínima requerida por el gestor de retención:
// obtener versiones y destruirlas. Tanto *GCPClient como los mocks de prueba la implementan.
type GCPClientInterface interface {
	GetSecretVersions(ctx context.Context, projectID, secretID string) ([]SecretVersion, error)
	DestroySecretVersion(ctx context.Context, projectID, secretID, versionID string) error
}

// InfisicalClientInterface permite sustituir Infisical por un fake en pruebas.
type InfisicalClientInterface interface {
	GetSecretNames(ctx context.Context, projectID, environment, secretPath string) ([]string, error)
	GetSecretValue(ctx context.Context, projectID, environment, secretPath, secretKey string) (string, error)
}

// SecretVersion representa una versión de un secreto.
type SecretVersion struct {
	Name        string  `json:"name"`
	State       string  `json:"state"`
	CreateTime  string  `json:"createTime"`
	DestroyTime *string `json:"destroyTime,omitempty"`
}

// CloudRunSecretReference apunta a un secreto y una versión concretos usados
// por una revisión activa de Cloud Run.
type CloudRunSecretReference struct {
	SecretID string `json:"secret_id" yaml:"secret_id"`
	Version  string `json:"version" yaml:"version"`
}

// CloudRunRevision modela una revisión de Cloud Run que recibe tráfico.
type CloudRunRevision struct {
	Name              string                    `json:"name" yaml:"name"`
	SecretReferences  []CloudRunSecretReference `json:"secret_references" yaml:"secret_references"`
	CreatedAt         time.Time                 `json:"created_at" yaml:"created_at"`
	TrafficPercentage int                       `json:"traffic_percentage" yaml:"traffic_percentage"`
}

// SecretStatus representa el estado de un secreto tras la comparación.
type SecretStatus string

const (
	SecretNew       SecretStatus = "new"
	SecretChanged   SecretStatus = "changed"
	SecretUnchanged SecretStatus = "unchanged"
	SecretDeleted   SecretStatus = "deleted"
	SecretBlocked   SecretStatus = "blocked"
)

// SecretComparison compara un secreto sin persistir valores ni hashes.
type SecretComparison struct {
	SourceName string       `json:"source_name" yaml:"source_name"`
	TargetName string       `json:"target_name" yaml:"target_name"`
	SourceHash string       `json:"source_hash,omitempty" yaml:"source_hash,omitempty"`
	TargetHash string       `json:"target_hash,omitempty" yaml:"target_hash,omitempty"`
	Status     SecretStatus `json:"status" yaml:"status"`
	Allowed    bool         `json:"allowed" yaml:"allowed"`
	Promotable bool         `json:"promotable" yaml:"promotable"`
	Reason     string       `json:"reason,omitempty" yaml:"reason,omitempty"`
}

// SyncResult resume una ejecución de sincronización.
type SyncResult struct {
	Total     int         `json:"total" yaml:"total"`
	New       int         `json:"new" yaml:"new"`
	Changed   int         `json:"changed" yaml:"changed"`
	Unchanged int         `json:"unchanged" yaml:"unchanged"`
	Deleted   int         `json:"deleted" yaml:"deleted"`
	Blocked   int         `json:"blocked" yaml:"blocked"`
	Errors    []SyncError `json:"errors,omitempty" yaml:"errors,omitempty"`
	DryRun    bool        `json:"dry_run" yaml:"dry_run"`
}

// SyncError documenta un error sin adjuntar el valor del secreto.
type SyncError struct {
	SecretName string `json:"secret_name" yaml:"secret_name"`
	Error      string `json:"error" yaml:"error"`
}

// DiffReport representa un reporte de diferencias de secretos.
type DiffReport struct {
	GeneratedAt   time.Time           `json:"generated_at" yaml:"generated_at"`
	SourceEnv     string              `json:"source_env" yaml:"source_env"`
	TargetEnv     string              `json:"target_env" yaml:"target_env"`
	Total         int                 `json:"total" yaml:"total"`
	New           int                 `json:"new" yaml:"new"`
	Changed       int                 `json:"changed" yaml:"changed"`
	Unchanged     int                 `json:"unchanged" yaml:"unchanged"`
	Deleted       int                 `json:"deleted" yaml:"deleted"`
	Blocked       int                 `json:"blocked" yaml:"blocked"`
	Promotable    int                 `json:"promotable" yaml:"promotable"`
	Comparisons   []SecretComparison  `json:"comparisons" yaml:"comparisons"`
	PromotionPlan []PromotionPlanItem `json:"promotion_plan,omitempty" yaml:"promotion_plan,omitempty"`
	DryRun        bool                `json:"dry_run" yaml:"dry_run"`
}

// PromotionPlanItem es una entrada aprobada del plan de promoción.
type PromotionPlanItem struct {
	SourceName string `json:"source_name" yaml:"source_name"`
	TargetName string `json:"target_name" yaml:"target_name"`
	Status     string `json:"status" yaml:"status"`
	Reason     string `json:"reason" yaml:"reason"`
	Allowed    bool   `json:"allowed" yaml:"allowed"`
}

// EnvironmentMetadata describe el entorno lógico.
type EnvironmentMetadata struct {
	Name        string `yaml:"name"`
	DisplayName string `yaml:"display_name"`
	Region      string `yaml:"region"`
	Source      string `yaml:"source"`
}

// InfisicalConfig describe la conexión con Infisical.
type InfisicalConfig struct {
	BaseURL     string `yaml:"base_url"`
	Environment string `yaml:"environment"`
	SecretPath  string `yaml:"secret_path"`
	CacheTTL    string `yaml:"cache_ttl"`
}

// GoogleSecretManagerConfig describe el proyecto destino de Secret Manager.
type GoogleSecretManagerConfig struct {
	Enabled   bool   `yaml:"enabled"`
	ProjectID string `yaml:"project_id"`
	Region    string `yaml:"region"`
}

// CloudRunConfig identifica el servicio cuyas revisiones activas se verifican.
type CloudRunConfig struct {
	Service string `yaml:"service"`
	Region  string `yaml:"region"`
}

// EnvironmentConfig es la configuración completa de un entorno.
type EnvironmentConfig struct {
	Environment         EnvironmentMetadata       `yaml:"environment"`
	Infisical           InfisicalConfig           `yaml:"infisical"`
	GoogleSecretManager GoogleSecretManagerConfig `yaml:"google_secret_manager"`
	CloudRun            CloudRunConfig            `yaml:"cloud_run"`
	RequiredSecrets     []string                  `yaml:"required_secrets"`
	OptionalSecrets     []string                  `yaml:"optional_secrets"`
	PromotionAllowlist  []string                  `yaml:"promotion_allowlist"`
	NeverPromote        []string                  `yaml:"never_promote"`
	SecretNameMapping   map[string]string         `yaml:"secret_name_mapping"`
	VersionRetention    VersionRetention          `yaml:"version_retention"`
}

// PromotionRules son las reglas globales de la allowlist.
type PromotionRules struct {
	RequireCIPass          bool `yaml:"require_ci_pass"`
	RequireApproval        bool `yaml:"require_approval"`
	MaxSecretsPerPromotion int  `yaml:"max_secrets_per_promotion"`
	DryRunDefault          bool `yaml:"dry_run_default"`
}

// AllowedPromotion define una promoción explícita origen -> destino.
type AllowedPromotion struct {
	Source      string `yaml:"source"`
	Target      string `yaml:"target"`
	Reason      string `yaml:"reason"`
	Environment string `yaml:"environment"`
}

// ValidationRule es una regla previa a la promoción.
type ValidationRule struct {
	Name        string `yaml:"name"`
	Description string `yaml:"description"`
	Required    bool   `yaml:"required"`
}

// PromotionAllowlist es la allowlist de promociones autorizadas.
type PromotionAllowlist struct {
	PromotionRules    PromotionRules     `yaml:"promotion_rules"`
	AllowedPromotions []AllowedPromotion `yaml:"allowed_promotions"`
	BlockedPromotions []string           `yaml:"blocked_promotions"`
	ValidationRules   []ValidationRule   `yaml:"validation_rules"`
}

// VersionRetention define la política de versiones de un entorno.
// En QA keep_latest y max_versions_per_secret deben ser exactamente 2.
type VersionRetention struct {
	KeepLatest                   int    `yaml:"keep_latest"`
	MaxVersionsPerSecret         int    `yaml:"max_versions_per_secret"`
	DestroyUnreferencedAfterDays int    `yaml:"destroy_unreferenced_after_days"`
	DryRunDefault                bool   `yaml:"dry_run_default"`
	DestroyState                 string `yaml:"destroy_state"`
}

// VersionCandidate describe una versión analizada. Nunca incluye su valor.
type VersionCandidate struct {
	SecretID    string    `json:"secret_id" yaml:"secret_id"`
	VersionID   string    `json:"version_id" yaml:"version_id"`
	State       string    `json:"state" yaml:"state"`
	CreatedAt   time.Time `json:"created_at" yaml:"created_at"`
	Recoverable bool      `json:"recoverable" yaml:"recoverable"`
	Referenced  bool      `json:"referenced" yaml:"referenced"`
	Protected   bool      `json:"protected" yaml:"protected"`
	CanDestroy  bool      `json:"can_destroy" yaml:"can_destroy"`
	Reason      string    `json:"reason" yaml:"reason"`
}

// RetentionReport resume el análisis de retención sin datos sensibles.
type RetentionReport struct {
	GeneratedAt        time.Time          `json:"generated_at" yaml:"generated_at"`
	ProjectID          string             `json:"project_id" yaml:"project_id"`
	Environment        string             `json:"environment" yaml:"environment"`
	PolicyKeepLatest   int                `json:"policy_keep_latest" yaml:"policy_keep_latest"`
	TotalSecrets       int                `json:"total_secrets" yaml:"total_secrets"`
	TotalVersions      int                `json:"total_versions" yaml:"total_versions"`
	Recoverable        int                `json:"recoverable" yaml:"recoverable"`
	Destroyable        int                `json:"destroyable" yaml:"destroyable"`
	Protected          int                `json:"protected" yaml:"protected"`
	Exceptions         int                `json:"exceptions" yaml:"exceptions"`
	ReferencesVerified bool               `json:"references_verified" yaml:"references_verified"`
	ReferenceError     string             `json:"reference_error,omitempty" yaml:"reference_error,omitempty"`
	SecretIDs          []string           `json:"secret_ids" yaml:"secret_ids"`
	Candidates         []VersionCandidate `json:"candidates" yaml:"candidates"`
	DryRun             bool               `json:"dry_run" yaml:"dry_run"`
}
