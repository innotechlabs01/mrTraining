package infisical

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Client is a minimal Infisical API client for secret retrieval
type Client struct {
	baseURL    string
	httpClient *http.Client
	token      string
	tokenExp   time.Time
	clientID   string
	clientSec  string
}

// NewClient creates a new Infisical client
func NewClient(baseURL, clientID, clientSecret string) *Client {
	return &Client{
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		clientID:   clientID,
		clientSec:  clientSecret,
	}
}

// Authenticate performs Universal Auth login and stores the access token
func (c *Client) Authenticate(ctx context.Context) error {
	data := url.Values{}
	data.Set("clientId", c.clientID)
	data.Set("clientSecret", c.clientSec)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/v1/auth/universal-auth/login",
		bytes.NewBufferString(data.Encode()))
	if err != nil {
		return fmt.Errorf("create auth request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("auth request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read auth response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("auth failed (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		AccessToken string `json:"accessToken"`
		ExpiresIn   int    `json:"expiresIn"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("parse auth response: %w", err)
	}

	c.token = result.AccessToken
	c.tokenExp = time.Now().Add(time.Duration(result.ExpiresIn) * time.Second)
	return nil
}

// ensureAuthenticated checks token validity and re-authenticates if needed
func (c *Client) ensureAuthenticated(ctx context.Context) error {
	if c.token == "" || time.Now().Add(30*time.Second).After(c.tokenExp) {
		return c.Authenticate(ctx)
	}
	return nil
}

// GetSecrets retrieves all secrets for a project/environment
func (c *Client) GetSecrets(ctx context.Context, projectID, environment, secretPath string) (map[string]string, error) {
	if err := c.ensureAuthenticated(ctx); err != nil {
		return nil, err
	}

	params := url.Values{}
	params.Set("projectId", projectID)
	params.Set("environment", environment)
	if secretPath != "" {
		params.Set("secretPath", secretPath)
	}
	params.Set("attachToProcessEnv", "false")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/api/v3/secrets/raw?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("create secrets request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("secrets request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read secrets response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get secrets failed (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Secrets []struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		} `json:"secrets"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse secrets response: %w", err)
	}

	secrets := make(map[string]string, len(result.Secrets))
	for _, s := range result.Secrets {
		secrets[s.Key] = s.Value
	}
	return secrets, nil
}

// GetSecret retrieves a single secret by key
func (c *Client) GetSecret(ctx context.Context, projectID, environment, secretPath, secretKey string) (string, error) {
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
		return "", fmt.Errorf("create secret request: %w", err)
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