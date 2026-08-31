// Package invite defines the coach invitation domain entities.
package invite

// Invite represents a coach invitation code that athletes can accept.
type Invite struct {
	ID        string `json:"id"`
	CoachID   string `json:"coach_id"`
	Code      string `json:"code"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// AcceptResult is the outcome of accepting an invite.
type AcceptResult struct {
	Success   bool   `json:"success"`
	CoachName string `json:"coachName,omitempty"`
}
