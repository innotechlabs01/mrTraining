// Package firebase provides the Firebase Cloud Messaging (FCM) infrastructure
// for sending push notifications to registered devices.
package firebase

import (
	"context"
	"encoding/json"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// FCMSender sends push notifications via Firebase Cloud Messaging.
// It wraps the Firebase messaging client and provides simplified methods
// for sending to single or multiple devices.
type FCMSender struct {
	client *messaging.Client
}

// NewFCMSender creates a new FCM sender using service account credentials.
// The projectID, clientEmail, and privateKey are extracted from the Firebase
// service account JSON. Returns nil and no error if all parameters are empty,
// indicating FCM is not configured (optional feature).
func NewFCMSender(projectID, clientEmail, privateKey string) (*FCMSender, error) {
	// If no credentials provided, FCM is disabled — return nil sender
	if projectID == "" || clientEmail == "" || privateKey == "" {
		return nil, nil
	}

	ctx := context.Background()

	// Build service account credentials
	creds := map[string]interface{}{
		"type":                        "service_account",
		"project_id":                  projectID,
		"private_key_id":              "",
		"private_key":                 privateKey,
		"client_email":                clientEmail,
		"client_id":                   "",
		"auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
		"token_uri":                   "https://oauth2.googleapis.com/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_x509_cert_url":        "",
	}

	// Marshal credentials to JSON for the SDK
	credJSON, err := json.Marshal(creds)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal firebase credentials: %w", err)
	}

	config := &firebase.Config{
		ProjectID: projectID,
	}

	app, err := firebase.NewApp(ctx, config, option.WithCredentialsJSON(credJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize messaging client: %w", err)
	}

	return &FCMSender{client: client}, nil
}

// SendToDevice sends a push notification to a single device token.
// The data map is optional and can be nil.
func (s *FCMSender) SendToDevice(ctx context.Context, token string, title, body string, data map[string]string) error {
	if s == nil || s.client == nil {
		return nil // FCM not configured, skip silently
	}

	msg := &messaging.Message{
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Token: token,
	}

	if len(data) > 0 {
		msg.Data = data
	}

	_, err := s.client.Send(ctx, msg)
	if err != nil {
		return fmt.Errorf("failed to send FCM notification: %w", err)
	}

	return nil
}

// SendToMultiple sends a push notification to multiple device tokens.
// Returns an error if the multicast send fails entirely; individual token
// failures are reported in the response but do not cause an error return.
func (s *FCMSender) SendToMultiple(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	if s == nil || s.client == nil {
		return nil // FCM not configured, skip silently
	}

	if len(tokens) == 0 {
		return nil
	}

	msg := &messaging.MulticastMessage{
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Tokens: tokens,
	}

	if len(data) > 0 {
		msg.Data = data
	}

	_, err := s.client.SendEachForMulticast(ctx, msg)
	if err != nil {
		return fmt.Errorf("failed to send multicast FCM notification: %w", err)
	}

	return nil
}
