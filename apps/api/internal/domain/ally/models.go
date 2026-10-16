// Package ally models the commercial ally network (Alianzas): the ally business
// profile, its members, and the relationship between a coach and an ally.
//
// Business-facing wording is Spanish, but every identifier, table and column is
// English on purpose (allies, relationships, ...) so the database and the Go
// API stay consistent with the rest of the monorepo.
package ally

// Ally is a commercial partner (gym, nutrition store, physiotherapy, ...).
type Ally struct {
	ID             string `json:"id"`
	OwnerUserID    string `json:"owner_user_id,omitempty"`
	LegalName      string `json:"legal_name"`
	CommercialName string `json:"commercial_name"`
	Category       string `json:"category"`
	ContactEmail   string `json:"contact_email,omitempty"`
	ContactPhone   string `json:"contact_phone,omitempty"`
	TaxID          string `json:"tax_id,omitempty"`
	Status         string `json:"status"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

// AllyMember links an application user to an ally organisation.
type AllyMember struct {
	ID        string `json:"id"`
	AllyID    string `json:"ally_id"`
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

// Relationship is the link between a coach and an ally.
type Relationship struct {
	ID           string `json:"id"`
	CoachID      string `json:"coach_id"`
	AllyID       string `json:"ally_id"`
	Status       string `json:"status"`
	AttributedBy string `json:"attributed_by,omitempty"`
	InvitedAt    string `json:"invited_at,omitempty"`
	ActivatedAt  string `json:"activated_at,omitempty"`
	EndedAt      string `json:"ended_at,omitempty"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// Summary is a lightweight ally view scoped to a single relationship. It is what
// list endpoints return and it always carries the relationship id so the caller
// can address the pairing unambiguously.
type Summary struct {
	RelationshipID string `json:"relationship_id"`
	CoachID        string `json:"coach_id"`
	AllyID         string `json:"ally_id"`
	LegalName      string `json:"legal_name"`
	CommercialName string `json:"commercial_name"`
	Category       string `json:"category"`
	Status         string `json:"status"`
}

// Detail is the full ally view: the ally, its relationship to the caller and its
// members.
type Detail struct {
	Ally         *Ally         `json:"ally"`
	Relationship *Relationship `json:"relationship"`
	Members      []*AllyMember `json:"members"`
}

// CreateInput is the payload accepted when a coach registers a new ally. The
// ally starts as "pending"; the coach-ally relationship starts as "invited".
type CreateInput struct {
	CoachID        string
	LegalName      string
	CommercialName string
	Category       string
	ContactEmail   string
	ContactPhone   string
	TaxID          string
	OwnerUserID    string // optional; empty until an ally user owns the record
}
