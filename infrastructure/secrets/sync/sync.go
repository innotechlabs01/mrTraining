package sync

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// InfisicalClient es un cliente mínimo para la API de Infisical (Universal Auth)
type InfisicalClient struct {
	baseURL    string
	httpClient *http.Client
	token      string
	tokenExp   time.Time
	clientID   string
	clientSec  string
}

// NewInfisicalClient crea un cliente Infisical
func NewInfisicalClient(baseURL, clientID, clientSecret string) *InfisicalClient {
	return &InfisicalClient{
		baseURL:    strings.TrimSuffix(baseURL, "/"),
		httpClient: &http.Client{Timeout: 10 * time.Second},
		clientID:   clientID,
		clientSec:  clientSecret,
	}
}

// Authenticate realiza el login de Universal Auth y almacena el token
func (c *InfisicalClient) Authenticate(ctx context.Context) error {
	data := url.Values{}
	data.Set("clientId", c.clientID)
	data.Set("clientSecret", c.clientSec)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/v1/auth/universal-auth/login",
		bytes.NewBufferString(data.Encode()))
	if err != nil {
		return fmt.Errorf("crear request de autenticación: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request de autenticación falló: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("leer respuesta de autenticación: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("autenticación falló (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		AccessToken string `json:"accessToken"`
		ExpiresIn   int    `json:"expiresIn"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("parsear respuesta de autenticación: %w", err)
	}

	c.token = result.AccessToken
	c.tokenExp = time.Now().Add(time.Duration(result.ExpiresIn) * time.Second)
	return nil
}

// ensureAuthenticated verifica y renueva el token si es necesario
func (c *InfisicalClient) ensureAuthenticated(ctx context.Context) error {
	if c.token == "" || time.Now().Add(30*time.Second).After(c.tokenExp) {
		return c.Authenticate(ctx)
	}
	return nil
}

// GetSecretNames lista los nombres de secretos en un proyecto/entorno
func (c *InfisicalClient) GetSecretNames(ctx context.Context, projectID, environment, secretPath string) ([]string, error) {
	if err := c.ensureAuthenticated(ctx); err != nil {
		return nil, err
	}

	params := url.Values{}
	params.Set("projectId", projectID)
	params.Set("environment", environment)
	if secretPath != "" {
		params.Set("secretPath", secretPath)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/api/v3/secrets?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("crear request de secretos: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request de secretos falló: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("leer respuesta de secretos: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("obtener secretos falló (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Secrets []struct {
			Key string `json:"key"`
		} `json:"secrets"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsear respuesta de secretos: %w", err)
	}

	names := make([]string, 0, len(result.Secrets))
	for _, s := range result.Secrets {
		names = append(names, s.Key)
	}
	return names, nil
}

// GetSecretValue obtiene el valor de un secreto específico
func (c *InfisicalClient) GetSecretValue(ctx context.Context, projectID, environment, secretPath, secretKey string) (string, error) {
	if err := c.ensureAuthenticated(ctx); err != nil {
		return "", err
	}

	params := url.Values{}
	params.Set("projectId", projectID)
	params.Set("environment", environment)
	if secretPath != "" {
		params.Set("secretPath", secretPath)
	}
	params.Set("secretName", secretKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/api/v3/secrets/raw/"+url.PathEscape(secretKey)+"?"+params.Encode(), nil)
	if err != nil {
		return "", fmt.Errorf("crear request de secreto: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("secret request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read secret response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("get secret failed (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Secret struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		} `json:"secret"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse secret response: %w", err)
	}

	return result.Secret.Value, nil
}

// SyncEngine es el motor principal de sincronización de secretos
type SyncEngine struct {
	infisicalClient *InfisicalClient
	gcpClient       SecretManagerClient
	allowlist       *PromotionAllowlist
	dryRun          bool
	logger          func(format string, args ...interface{})
}

// NewSyncEngine crea un nuevo motor de sincronización
func NewSyncEngine(infisicalClient *InfisicalClient, gcpClient SecretManagerClient, allowlist *PromotionAllowlist, dryRun bool) *SyncEngine {
	return &SyncEngine{
		infisicalClient: infisicalClient,
		gcpClient:       gcpClient,
		allowlist:       allowlist,
		dryRun:          dryRun,
		logger:          func(format string, args ...interface{}) {},
	}
}

// SetLogger establece una función de logging
func (s *SyncEngine) SetLogger(logger func(format string, args ...interface{})) {
	s.logger = logger
}

// log imprime un mensaje si hay logger configurado (nunca imprime valores sensibles)
func (s *SyncEngine) log(format string, args ...interface{}) {
	if s.logger != nil {
		s.logger(format, args...)
	}
}

// Sync compara y sincroniza secretos entre Infisical y GCP Secret Manager
// Devuelve un SyncResult con el resultado de la operación
func (s *SyncEngine) Sync(ctx context.Context, sourceEnv, targetEnv *EnvironmentConfig, ciPassed bool) (*SyncResult, *DiffReport, error) {
	s.logger("Iniciando sincronización de secretos: %s -> %s (dry-run=%v)", sourceEnv.Environment.Name, targetEnv.Environment.Name, s.dryRun)

	// Validar reglas de promoción
	violations := s.allowlist.ValidatePromotionRules(ciPassed, targetEnv.Environment.Name)
	if len(violations) > 0 {
		return nil, nil, fmt.Errorf("violaciones de reglas de promoción: %v", violations)
	}

	// 1. Obtener secretos de Infisical (origen)
	s.logger("Obteniendo nombres de secretos de Infisical %s...", sourceEnv.Infisical.Environment)
	infisicalNames, err := s.infisicalClient.GetSecretNames(ctx, sourceEnv.GoogleSecretManager.ProjectID, sourceEnv.Infisical.Environment, sourceEnv.Infisical.SecretPath)
	if err != nil {
		return nil, nil, fmt.Errorf("obtener secretos de Infisical: %w", err)
	}

	// Obtener valores de los secretos requeridos en Infisical
	sourceSecrets := make(map[string]string)
	for _, name := range infisicalNames {
		// Solo obtener valores de secretos que nos interesan (requeridos o opcionales)
		isRequired := contains(sourceEnv.RequiredSecrets, name)
		isOptional := contains(sourceEnv.OptionalSecrets, name)
		if !isRequired && !isOptional {
			continue
		}

		value, err := s.infisicalClient.GetSecretValue(ctx, sourceEnv.GoogleSecretManager.ProjectID, sourceEnv.Infisical.Environment, sourceEnv.Infisical.SecretPath, name)
		if err != nil {
			s.logger("  ⚠️  No se pudo obtener valor de %s: %v", name, err)
			continue
		}
		sourceSecrets[name] = value
	}

	s.logger("  Obtenidos %d secretos de Infisical", len(sourceSecrets))

	// 2. Obtener secretos de GCP Secret Manager (destino)
	s.logger("Obteniendo nombres de secretos de GCP Secret Manager %s...", targetEnv.GoogleSecretManager.ProjectID)
	gcpNames, err := s.gcpClient.ListSecrets(ctx, targetEnv.GoogleSecretManager.ProjectID)
	if err != nil {
		return nil, nil, fmt.Errorf("obtener secretos de GCP Secret Manager: %w", err)
	}

	gcpSecrets := make(map[string]string)
	for _, shortName := range gcpNames {
		// Solo nos interesamos en secretos QA (terminan en _QA)
		if !strings.HasSuffix(shortName, "_QA") {
			continue
		}

		value, err := s.gcpClient.GetSecretValue(ctx, targetEnv.GoogleSecretManager.ProjectID, shortName)
		if err != nil {
			s.logger("  ⚠️  No se pudo obtener valor de %s: %v", shortName, err)
			continue
		}
		gcpSecrets[shortName] = value
	}

	s.logger("  Obtenidos %d secretos de GCP Secret Manager", len(gcpSecrets))

	// 3. Comparar secretos
	comparisons := CompareSecrets(sourceSecrets, gcpSecrets, s.allowlist)

	// 4. Generar reporte
	report := GenerateDiffReport(sourceEnv.Environment.Name, targetEnv.Environment.Name, comparisons, s.dryRun)
	s.logger("  Comparación: %d nuevos, %d modificados, %d sin cambios, %d eliminados, %d bloqueados",
		report.New, report.Changed, report.Unchanged, report.Deleted, report.Blocked)

	// 5. Sincronizar secretos aprobados (solo si no es dry-run)
	result := &SyncResult{
		Total:     report.Total,
		New:       report.New,
		Changed:   report.Changed,
		Unchanged: report.Unchanged,
		Blocked:   report.Blocked,
		Deleted:   report.Deleted,
		DryRun:    s.dryRun,
	}

	if s.dryRun {
		s.logger("  MODO DRY-RUN: No se realizarán cambios reales")
		return result, report, nil
	}

	// Sincronizar secretos nuevos y modificados
	promotable := FilterPromotable(comparisons)
	for _, c := range promotable {
		targetName := c.TargetName
		if targetName == "" {
			targetName = c.SourceName
		}

		// Obtener el valor real desde Infisical
		value, err := s.infisicalClient.GetSecretValue(ctx, sourceEnv.GoogleSecretManager.ProjectID, sourceEnv.Infisical.Environment, sourceEnv.Infisical.SecretPath, c.SourceName)
		if err != nil {
			result.Errors = append(result.Errors, SyncError{
				SecretName: c.SourceName,
				Error:      err.Error(),
			})
			continue
		}

		// Crear el secreto si no existe
		if c.Status == SecretNew {
			s.logger("  Creando secreto %s en GCP Secret Manager...", targetName)
			err := s.gcpClient.CreateSecret(ctx, targetEnv.GoogleSecretManager.ProjectID, targetName)
			if err != nil {
				result.Errors = append(result.Errors, SyncError{
					SecretName: targetName,
					Error:      err.Error(),
				})
				continue
			}
			result.New++
		}

		// Crear nueva versión
		s.logger("  Creando nueva versión de %s en GCP Secret Manager...", targetName)
		version, err := s.gcpClient.CreateSecretVersion(ctx, targetEnv.GoogleSecretManager.ProjectID, targetName, value)
		if err != nil {
			result.Errors = append(result.Errors, SyncError{
				SecretName: targetName,
				Error:      err.Error(),
			})
			continue
		}
		s.logger("    Versión creada: %s", version)
		result.Changed++
	}

	// 6. Verificar versiones creadas
	s.logger("Sincronización completada: %d nuevos, %d modificados, %d errores",
		result.New, result.Changed, len(result.Errors))

	return result, report, nil
}

// contains verifica si un string está en un slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
