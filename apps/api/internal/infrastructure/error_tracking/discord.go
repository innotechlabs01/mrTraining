// Package error_tracking provides Discord webhook integration for error notifications.
// When a new error is created, it is posted to a Discord channel so the super admin
// can see and track platform errors in real time.
package error_tracking

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
)

// DiscordSender sends error notifications to a Discord channel via webhook.
// It returns the Discord message ID and channel ID for tracking.
type DiscordSender struct {
	webhookURL string
	client     *http.Client
}

// NewDiscordSender creates a Discord sender with the given webhook URL.
// If webhookURL is empty, the sender is a no-op (errors are still saved to DB).
func NewDiscordSender(webhookURL string) *DiscordSender {
	return &DiscordSender{
		webhookURL: webhookURL,
		client:     &http.Client{Timeout: 10 * time.Second},
	}
}

// Send posts an error notification to Discord.
// Returns the Discord message ID and channel ID, or empty strings if webhook is not configured.
func (s *DiscordSender) Send(ctx context.Context, e *domain.Error) (messageID, channelID string, err error) {
	if s.webhookURL == "" {
		return "", "", nil
	}

	// Discord embed color by severity
	color := 0x3498db // blue (default)
	switch e.Severity {
	case domain.SeverityCritical:
		color = 0xed4245 // red
	case domain.SeverityHigh:
		color = 0xfaa81a // orange
	case domain.SeverityMedium:
		color = 0xfcc42b // yellow
	case domain.SeverityLow:
		color = 0x3ba55d // green
	}

	embed := map[string]interface{}{
		"title":       e.Title,
		"description": e.Description,
		"color":       color,
		"fields": []map[string]interface{}{
			{"name": "Source", "value": e.Source, "inline": true},
			{"name": "Severity", "value": e.Severity, "inline": true},
			{"name": "Status", "value": e.Status, "inline": true},
			{"name": "ID", "value": e.ID, "inline": true},
			{"name": "Created", "value": e.CreatedAt.Format("2006-01-02 15:04:05 UTC"), "inline": true},
		},
		"footer": map[string]interface{}{
			"text": "MR Training Platform Errors",
		},
		"timestamp": e.CreatedAt.Format(time.RFC3339),
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{embed},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", fmt.Errorf("marshal discord payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.webhookURL, bytes.NewReader(body))
	if err != nil {
		return "", "", fmt.Errorf("create discord request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("discord request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("discord error: status %d: %s", resp.StatusCode, string(respBody))
	}

	// Discord returns the message ID in the response for webhook messages
	respBody, _ := io.ReadAll(resp.Body)
	var discordResp struct {
		ID        string `json:"id"`
		ChannelID string `json:"channel_id"`
	}
	if err := json.Unmarshal(respBody, &discordResp); err == nil {
		return discordResp.ID, discordResp.ChannelID, nil
	}
	return "", "", nil
}
