package sync

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2/google"
)

// GCPClient es un cliente REST para Google Secret Manager
type GCPClient struct {
	httpClient *http.Client
	baseURL    string
	token      string
	tokenExp   time.Time
}

// NewGCPClient crea un cliente REST para Secret Manager usando credenciales por defecto (WIF)
func NewGCPClient(ctx context.Context) (*GCPClient, error) {
	creds, err := google.FindDefaultCredentials(ctx)
	if err != nil {
		return nil, fmt.Errorf("no se pudieron obtener credenciales por defecto: %w", err)
	}

	return &GCPClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    "https://secretmanager.googleapis.com/v1",
		token:      string(creds.JSON),
	}, nil
}

// getAccessToken obtiene un token de acceso OAuth2 (simplificado para WIF)
// En producción con WIF, el token se obtiene del metadata server automáticamente
func (c *GCPClient) getAccessToken(ctx context.Context) (string, error) {
	if c.token != "" && time.Now().Add(5*time.Minute).Before(c.tokenExp) {
		return c.token, nil
	}

	// Para WIF en GitHub Actions, el token se obtiene del entorno
	// Aquí usamos un enfoque simplificado: las credenciales de Google FindDefaultCredentials
	// incluyen el token necesario para autenticación
	return c.token, nil
}

// doRequest realiza una petición autenticada a la API de Secret Manager
func (c *GCPClient) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("obtener token: %w", err)
	}

	var bodyBytes []byte
	if body != nil {
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("crear request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ejecutar request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("leer respuesta: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// ListSecrets lista todos los secretos en un proyecto
func (c *GCPClient) ListSecrets(ctx context.Context, projectID string) ([]string, error) {
	path := fmt.Sprintf("/projects/%s/secrets", projectID)
	respBody, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Secrets []struct {
			Name string `json:"name"`
		} `json:"secrets"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parsear lista de secretos: %w", err)
	}

	names := make([]string, 0, len(result.Secrets))
	for _, s := range result.Secrets {
		names = append(names, ExtractShortName(s.Name))
	}
	return names, nil
}

// GetSecretValue obtiene el valor de la última versión de un secreto
func (c *GCPClient) GetSecretValue(ctx context.Context, projectID, secretID string) (string, error) {
	path := fmt.Sprintf("/projects/%s/secrets/%s/versions/latest:access", projectID, secretID)
	respBody, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return "", err
	}

	var result struct {
		Payload struct {
			Data string `json:"data"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parsear valor de secreto: %w", err)
	}

	data, err := base64.StdEncoding.DecodeString(result.Payload.Data)
	if err != nil {
		return "", fmt.Errorf("decodificar valor base64: %w", err)
	}

	return string(data), nil
}

// AccessSecretVersion accede al valor de una versión específica de un secreto
func (c *GCPClient) AccessSecretVersion(ctx context.Context, projectID, secretID, version string) (string, error) {
	path := fmt.Sprintf("/projects/%s/secrets/%s/versions/%s:access", projectID, secretID, version)
	respBody, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return "", err
	}

	var result struct {
		Payload struct {
			Data string `json:"data"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parsear valor de versión: %w", err)
	}

	data, err := base64.StdEncoding.DecodeString(result.Payload.Data)
	if err != nil {
		return "", fmt.Errorf("decodificar valor base64: %w", err)
	}

	return string(data), nil
}

// GetSecretVersions lista todas las versiones de un secreto
func (c *GCPClient) GetSecretVersions(ctx context.Context, projectID, secretID string) ([]SecretVersion, error) {
	path := fmt.Sprintf("/projects/%s/secrets/%s/versions", projectID, secretID)
	respBody, err := c.doRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Versions []struct {
			Name        string  `json:"name"`
			State       string  `json:"state"`
			CreateTime  string  `json:"createTime"`
			DestroyTime *string `json:"destroyTime,omitempty"`
		} `json:"versions"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parsear versiones de secreto: %w", err)
	}

	versions := make([]SecretVersion, 0, len(result.Versions))
	for _, v := range result.Versions {
		versions = append(versions, SecretVersion{
			Name:        v.Name,
			State:       v.State,
			CreateTime:  v.CreateTime,
			DestroyTime: v.DestroyTime,
		})
	}
	return versions, nil
}

// CreateSecret crea un nuevo secreto
func (c *GCPClient) CreateSecret(ctx context.Context, projectID, secretID string) error {
	path := fmt.Sprintf("/projects/%s/secrets?secretId=%s", projectID, secretID)
	body := map[string]interface{}{
		"replication": map[string]interface{}{
			"automatic": map[string]interface{}{},
		},
	}
	_, err := c.doRequest(ctx, "POST", path, body)
	return err
}

// CreateSecretVersion crea una nueva versión de un secreto
func (c *GCPClient) CreateSecretVersion(ctx context.Context, projectID, secretID, value string) (string, error) {
	path := fmt.Sprintf("/projects/%s/secrets/%s/versions:add", projectID, secretID)
	body := map[string]interface{}{
		"payload": map[string]interface{}{
			"data": base64.StdEncoding.EncodeToString([]byte(value)),
		},
	}
	respBody, err := c.doRequest(ctx, "POST", path, body)
	if err != nil {
		return "", err
	}

	var result struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parsear versión creada: %w", err)
	}
	return result.Name, nil
}

// DestroySecretVersion destruye una versión de secreto
func (c *GCPClient) DestroySecretVersion(ctx context.Context, projectID, secretID, versionID string) error {
	path := fmt.Sprintf("/projects/%s/secrets/%s/versions/%s:destroy", projectID, secretID, versionID)
	_, err := c.doRequest(ctx, "DELETE", path, nil)
	return err
}
