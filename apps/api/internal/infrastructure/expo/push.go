// Package expo provides a push notification sender based on the Expo Push API.
// It is used for mobile notifications when device tokens are Expo push tokens.
package expo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

const pushEndpoint = "https://exp.host/--/api/v2/push/send"

type Sender struct {
	client *http.Client
}

// PushResult represents per-token Expo push delivery feedback.
type PushResult struct {
	Token   string
	Status  string
	Message string
	Error   string // e.g. "DeviceNotRegistered"
}

// NewSender creates an Expo push sender backed by a resilient HTTP client.
func NewSender() *Sender {
	cb := resilience.RegisterBreaker(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
		Name:             "expo_push",
		FailureThreshold: 5,
		ResetTimeout:     30 * time.Second,
	}))
	bh := resilience.NewBulkhead("expo_push", 10, 250*time.Millisecond)
	return &Sender{
		client: resilience.NewHTTPClient(resilience.HTTPClientConfig{
			Name:     "expo_push",
			Timeout:  8 * time.Second,
			Breaker:  cb,
			Bulkhead: bh,
		}),
	}
}

// SetHTTPClient overrides the HTTP client (primarily for tests).
func (s *Sender) SetHTTPClient(client *http.Client) {
	if client != nil {
		s.client = client
	}
}

type message struct {
	To    string         `json:"to"`
	Title string         `json:"title"`
	Body  string         `json:"body"`
	Data  map[string]any `json:"data,omitempty"`
}

func (s *Sender) SendToDevice(ctx context.Context, token, title, body string, data map[string]string) error {
	return s.SendToMultiple(ctx, []string{token}, title, body, data)
}

func (s *Sender) SendToMultiple(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	_, err := s.SendToMultipleWithReport(ctx, tokens, title, body, data)
	return err
}

// SendToMultipleWithReport sends pushes and parses Expo's per-token ticket array
// so callers can detect stale tokens ("DeviceNotRegistered").
func (s *Sender) SendToMultipleWithReport(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]PushResult, error) {
	if len(tokens) == 0 {
		return nil, nil
	}

	mappedData := make(map[string]any, len(data))
	for k, v := range data {
		mappedData[k] = v
	}

	messages := make([]message, 0, len(tokens))
	for _, token := range tokens {
		messages = append(messages, message{
			To:    token,
			Title: title,
			Body:  body,
			Data:  mappedData,
		})
	}

	bodyBytes, err := json.Marshal(messages)
	if err != nil {
		return nil, fmt.Errorf("marshal expo push payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, pushEndpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("create expo push request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send expo push request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("expo push api returned status %d", resp.StatusCode)
	}

	var parsed struct {
		Data []struct {
			Status  string `json:"status"`
			Message string `json:"message"`
			Details struct {
				Error string `json:"error"`
			} `json:"details"`
		} `json:"data"`
	}
	results := make([]PushResult, 0, len(tokens))
	if err := json.Unmarshal(respBytes, &parsed); err == nil {
		for i, item := range parsed.Data {
			tok := ""
			if i < len(tokens) {
				tok = tokens[i]
			}
			results = append(results, PushResult{
				Token:   tok,
				Status:  item.Status,
				Message: item.Message,
				Error:   item.Details.Error,
			})
		}
	}
	return results, nil
}