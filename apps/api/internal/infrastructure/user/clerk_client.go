package user

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"
)

// ClerkClient is a minimal Clerk Backend API client used for user
// provisioning: when the Go API sees an authenticated user that has no
// row in its database yet (e.g. the webhook missed the user.created
// event), it fetches identity data from Clerk to seed the rows.
type ClerkClient struct {
	secretKey string
	http      *http.Client
}

// NewClerkClient creates a Clerk Backend API client with the instance secret key.
func NewClerkClient(secretKey string) *ClerkClient {
	return &ClerkClient{
		secretKey: secretKey,
		http:      &http.Client{Timeout: 5 * time.Second},
	}
}

// ClerkUserData holds the identity fields needed for provisioning.
type ClerkUserData struct {
	ID        string
	Email     string
	FirstName string
	LastName  string
	// PublicMetadata is the client-readable metadata (role, coachCode, ...).
	// It is the source of truth for the app's role resolution.
	PublicMetadata map[string]interface{}
	// UnsafeMetadata is the server-written metadata (plan selection, ...).
	UnsafeMetadata map[string]interface{}
}

type clerkUserResponse struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	EmailAddresses []struct {
		EmailAddress string `json:"email_address"`
	} `json:"email_addresses"`
	PublicMetadata map[string]interface{} `json:"public_metadata"`
	UnsafeMetadata map[string]interface{} `json:"unsafe_metadata"`
}

// FetchUser fetches a user's identity data from the Clerk Backend API.
func (c *ClerkClient) FetchUser(ctx context.Context, userID string) (*ClerkUserData, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.clerk.com/v1/users/"+userID, nil)
	if err != nil {
		return nil, fmt.Errorf("build clerk request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("clerk request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clerk request failed: status %d", resp.StatusCode)
	}

	var clerkUser clerkUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&clerkUser); err != nil {
		return nil, fmt.Errorf("decode clerk response: %w", err)
	}

	data := &ClerkUserData{
		ID:             clerkUser.ID,
		FirstName:      clerkUser.FirstName,
		LastName:       clerkUser.LastName,
		PublicMetadata: clerkUser.PublicMetadata,
		UnsafeMetadata: clerkUser.UnsafeMetadata,
	}
	if len(clerkUser.EmailAddresses) > 0 {
		data.Email = clerkUser.EmailAddresses[0].EmailAddress
	}
	return data, nil
}

// GenerateCoachCode generates a coach invite code like "MR-A7K2".
func GenerateCoachCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 4)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			// Deterministic fallback — must never fail provisioning.
			code[i] = alphabet[i%len(alphabet)]
			continue
		}
		code[i] = alphabet[n.Int64()]
	}
	return "MR-" + string(code)
}

// GetUser adapts the raw Clerk fetch to the application layer's
// IdentityProvider port (email, name).
func (c *ClerkClient) GetUser(ctx context.Context, userID string) (string, string, error) {
	data, err := c.FetchUser(ctx, userID)
	if err != nil {
		return "", "", err
	}
	name := (data.FirstName + " " + data.LastName)
	if name == " " {
		name = ""
	}
	return data.Email, name, nil
}

// UpdatePublicMetadata replaces a user's PUBLIC metadata in Clerk.
//
// The Clerk Backend API expects the payload key `public_metadata`.
// Sending a bare `metadata` key is silently ignored by Clerk, which made
// role/coachCode writes disappear — the web layer then resolved every coach
// as "athlete" and bounced them off /coach.
//
// Public metadata is readable by the client, so it must never carry secrets.
func (c *ClerkClient) UpdatePublicMetadata(ctx context.Context, userID string, metadata map[string]interface{}) error {
	return c.patchMetadata(ctx, userID, "public_metadata", metadata)
}

// UpdateUnsafeMetadata replaces a user's UNSAFE (server-only) metadata in
// Clerk. Use it for values the client must not be able to read or forge.
func (c *ClerkClient) UpdateUnsafeMetadata(ctx context.Context, userID string, metadata map[string]interface{}) error {
	return c.patchMetadata(ctx, userID, "unsafe_metadata", metadata)
}

// patchMetadata sends a metadata patch to the Clerk Backend API using the
// given top-level key ("public_metadata" / "unsafe_metadata").
func (c *ClerkClient) patchMetadata(ctx context.Context, userID, key string, metadata map[string]interface{}) error {
	body, err := json.Marshal(map[string]interface{}{
		key: metadata,
	})
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch,
		"https://api.clerk.com/v1/users/"+userID+"/metadata", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build clerk request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("clerk request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("clerk request failed: status %d, body: %s", resp.StatusCode, string(body))
	}
	return nil
}

// GetPublicMetadata reads a user's public metadata from Clerk.
func (c *ClerkClient) GetPublicMetadata(ctx context.Context, userID string) (map[string]interface{}, error) {
	data, err := c.FetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return data.PublicMetadata, nil
}
