// Package error_tracking defines the domain model for platform error tracking.
// Errors are saved to the database and pushed to Discord for super admin visibility.
// Status tracks lifecycle: open -> resolved (or ignored).
package error_tracking

import (
	"errors"
	"time"
)

// ErrNotFound is returned when an error record is not found.
var ErrNotFound = errors.New("error record not found")

// Status constants for error lifecycle.
const (
	StatusOpen    = "open"
	StatusResolved = "resolved"
	StatusIgnored = "ignored"
)

// Severity constants.
const (
	SeverityLow     = "low"
	SeverityMedium  = "medium"
	SeverityHigh    = "high"
	SeverityCritical = "critical"
)

// Error represents a platform error record.
type Error struct {
	ID                string    `json:"id"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Source            string    `json:"source"` // web, api, mobile, cron
	Severity          string    `json:"severity"` // low, medium, high, critical
	Status            string    `json:"status"` // open, resolved, ignored
	DiscordMessageID  string    `json:"discord_message_id,omitempty"`
	DiscordChannelID  string    `json:"discord_channel_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	ResolvedAt        *time.Time `json:"resolved_at,omitempty"`
	ResolvedBy        string    `json:"resolved_by,omitempty"`
	ResolvedNote      string    `json:"resolved_note,omitempty"`
}

// CreateErrorInput is the input to create a new error record.
type CreateErrorInput struct {
	Title     string `json:"title"`
	Description string `json:"description"`
	Source    string `json:"source"`
	Severity  string `json:"severity"`
}

// ResolveErrorInput is the input to resolve/ignore an error.
type ResolveErrorInput struct {
	Status  string `json:"status"` // resolved or ignored
	Note    string `json:"note,omitempty"`
}

// Validate checks that the input is valid.
func (i CreateErrorInput) Validate() error {
	if i.Title == "" {
		return errors.New("title is required")
	}
	if i.Description == "" {
		return errors.New("description is required")
	}
	if i.Source == "" {
		return errors.New("source is required")
	}
	switch i.Severity {
	case SeverityLow, SeverityMedium, SeverityHigh, SeverityCritical:
	default:
		return errors.New("severity must be low, medium, high, or critical")
	}
	return nil
}

func (i ResolveErrorInput) Validate() error {
	switch i.Status {
	case StatusResolved, StatusIgnored:
	default:
		return errors.New("status must be resolved or ignored")
	}
	return nil
}
