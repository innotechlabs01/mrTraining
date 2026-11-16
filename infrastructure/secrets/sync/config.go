package sync

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// LoadEnvironmentConfig carga y valida la configuración de un entorno.
func LoadEnvironmentConfig(envName string) (*EnvironmentConfig, error) {
	configPath := filepath.Join("environments", envName, "config.yaml")
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("no se pudo leer la configuración del entorno %s: %w", envName, err)
	}

	var env EnvironmentConfig
	if err := yaml.Unmarshal(data, &env); err != nil {
		return nil, fmt.Errorf("no se pudo parsear la configuración del entorno %s: %w", envName, err)
	}

	if err := ValidateRetentionPolicy(env.Environment.Name, env.VersionRetention); err != nil {
		return nil, fmt.Errorf("configuración de retención inválida para %s: %w", envName, err)
	}

	return &env, nil
}

// LoadPromotionAllowlist carga la allowlist de promoción.
func LoadPromotionAllowlist() (*PromotionAllowlist, error) {
	allowlistPath := filepath.Join("allowlist", "promotion-allowlist.yaml")
	data, err := os.ReadFile(allowlistPath)
	if err != nil {
		return nil, fmt.Errorf("no se pudo leer la allowlist de promoción: %w", err)
	}

	var allowlist PromotionAllowlist
	if err := yaml.Unmarshal(data, &allowlist); err != nil {
		return nil, fmt.Errorf("no se pudo parsear la allowlist de promoción: %w", err)
	}

	return &allowlist, nil
}

// ValidateRetentionPolicy garantiza que QA use exactamente dos versiones
// recuperables y que nunca queden versiones DISABLED generando costo.
func ValidateRetentionPolicy(environment string, policy VersionRetention) error {
	switch environment {
	case "qa":
		if policy.KeepLatest != QARecoverableVersions {
			return fmt.Errorf("QA exige keep_latest=%d, la configuración indica %d", QARecoverableVersions, policy.KeepLatest)
		}
		if policy.MaxVersionsPerSecret != QARecoverableVersions {
			return fmt.Errorf("QA exige max_versions_per_secret=%d, la configuración indica %d", QARecoverableVersions, policy.MaxVersionsPerSecret)
		}
		if policy.DestroyState != SecretVersionStateDestroyed {
			return fmt.Errorf("QA exige destroy_state=%s para no dejar versiones DISABLED facturables", SecretVersionStateDestroyed)
		}
		if !policy.DryRunDefault {
			return fmt.Errorf("QA exige dry_run_default=true")
		}
	case "production":
		if policy.KeepLatest < QARecoverableVersions {
			return fmt.Errorf("production debe conservar al menos %d versiones recuperables", QARecoverableVersions)
		}
		if !policy.DryRunDefault {
			return fmt.Errorf("production exige dry_run_default=true")
		}
	case "dev":
		// DEV no administra versiones de Secret Manager.
	default:
		return fmt.Errorf("entorno desconocido para retención: %s", environment)
	}
	return nil
}

// FindPromotion busca la promoción autorizada para un secreto de origen.
func (a *PromotionAllowlist) FindPromotion(source, targetEnv string) (AllowedPromotion, bool) {
	if a == nil {
		return AllowedPromotion{}, false
	}
	for _, promotion := range a.AllowedPromotions {
		if promotion.Source != source {
			continue
		}
		if targetEnv == "" || promotion.Environment == "" || promotion.Environment == targetEnv {
			return promotion, true
		}
	}
	return AllowedPromotion{}, false
}

// IsAllowedPromotion verifica si una promoción exacta está permitida.
func (a *PromotionAllowlist) IsAllowedPromotion(source, target string) (bool, string) {
	if a == nil {
		return false, ""
	}
	for _, promotion := range a.AllowedPromotions {
		if promotion.Source == source && promotion.Target == target {
			return true, promotion.Reason
		}
	}
	return false, ""
}

// IsSourceAllowed verifica si un secreto de origen está en la allowlist.
func (a *PromotionAllowlist) IsSourceAllowed(source string) (bool, string) {
	if a == nil {
		return false, ""
	}
	for _, promotion := range a.AllowedPromotions {
		if promotion.Source == source {
			return true, promotion.Reason
		}
	}
	return false, ""
}

// IsBlocked verifica si un secreto está en la lista de bloqueo.
func (a *PromotionAllowlist) IsBlocked(name string) bool {
	if a == nil {
		return false
	}
	for _, blocked := range a.BlockedPromotions {
		if blocked == name {
			return true
		}
	}
	return false
}

// ValidatePromotionRules valida que se cumplan las reglas de promoción.
func (a *PromotionAllowlist) ValidatePromotionRules(ciPassed bool, targetEnv string) []string {
	if a == nil {
		return []string{"allowlist de promoción no configurada"}
	}
	var violations []string
	for _, rule := range a.ValidationRules {
		switch rule.Name {
		case "ci_passed":
			if rule.Required && !ciPassed {
				violations = append(violations, fmt.Sprintf("regla '%s': %s", rule.Name, rule.Description))
			}
		case "target_not_production":
			if rule.Required && targetEnv == "production" {
				violations = append(violations, fmt.Sprintf("regla '%s': %s", rule.Name, rule.Description))
			}
		}
	}
	return violations
}
