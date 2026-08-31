package dto

// AcceptInviteRequest is the payload for accepting an invite code.
type AcceptInviteRequest struct {
	Code string `json:"code"`
}

// ValidateInviteRequest is the payload for validating an invite code via POST.
type ValidateInviteRequest struct {
	Code string `json:"code"`
}

// InviteResponse represents an invite in API responses.
type InviteResponse struct {
	ID        string `json:"id"`
	CoachID   string `json:"coach_id"`
	Code      string `json:"code"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// ValidateInviteResponse represents the result of a validate code operation.
type ValidateInviteResponse struct {
	Valid bool   `json:"valid"`
	Code  string `json:"code"`
}
