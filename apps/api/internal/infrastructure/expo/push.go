// Package expo provides a push notification sender based on the Expo Push API.
// It is used for mobile notifications when device tokens are Expo push tokens.
package expo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const pushEndpoint = "https://exp.host/--/api/v2/push/send"

type Sender struct {
	client *http.Client
}

// NewSender creates an Expo push sender. It does not require credentials.
func NewSender() *Sender {
	return &Sender{client: &http.Client{Timeout: 10 * time.Second}}
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
	if len(tokens) == 0 {
		return nil
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
		return fmt.Errorf("marshal expo push payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, pushEndpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("create expo push request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("send expo push request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("expo push api returned status %d", resp.StatusCode)
	}

	return nil
}