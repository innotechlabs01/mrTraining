package dto

import (
	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally"
	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission"
)

// CommissionAgreementResponse is the public view of a commission agreement version.
type CommissionAgreementResponse struct {
	ID               string  `json:"id"`
	RelationshipID   string  `json:"relationship_id"`
	Version          int64   `json:"version"`
	RateBps          int64   `json:"rate_bps"`
	FixedAmountCents int64   `json:"fixed_amount_cents"`
	EligibleBaseRule string  `json:"eligible_base_rule"`
	Rounding         string  `json:"rounding"`
	Currency         string  `json:"currency"`
	ValidFrom        string  `json:"valid_from"`
	ValidTo          string  `json:"valid_to,omitempty"`
	Status           string  `json:"status"`
	AcceptedBy       string  `json:"accepted_by,omitempty"`
	AcceptedAt       string  `json:"accepted_at,omitempty"`
	CreatedAt        string  `json:"created_at"`
}

// AllyRole is the role of a user inside an ally organisation.
type AllyRole string

const (
	AllyRoleOwner AllyRole = "owner"
	AllyRoleStaff AllyRole = "staff"
)

// AllySummaryResponse is a lightweight ally view scoped to a single relationship.
type AllySummaryResponse struct {
	RelationshipID string    `json:"relationship_id"`
	CoachID        string    `json:"coach_id"`
	AllyID         string    `json:"ally_id"`
	LegalName      string    `json:"legal_name"`
	CommercialName string    `json:"commercial_name"`
	Category       string    `json:"category"`
	Status         string    `json:"status"`
}

// AllyMemberResponse links an application user to an ally organisation.
type AllyMemberResponse struct {
	ID        string `json:"id"`
	AllyID    string `json:"ally_id"`
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

// AllyDetailResponse is the full ally view for one relationship.
type AllyDetailResponse struct {
	Ally         *AllyResponse        `json:"ally"`
	Relationship *RelationshipResponse `json:"relationship"`
	Members      []*AllyMemberResponse `json:"members"`
}

// AllyResponse is the public ally profile.
type AllyResponse struct {
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

// RelationshipResponse is the link between a coach and an ally.
type RelationshipResponse struct {
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

// CreateAllyRequest is the payload for registering a new ally.
type CreateAllyRequest struct {
	LegalName      string `json:"legal_name"`
	CommercialName string `json:"commercial_name"`
	Category       string `json:"category"`
	ContactEmail   string `json:"contact_email,omitempty"`
	ContactPhone   string `json:"contact_phone,omitempty"`
	TaxID          string `json:"tax_id,omitempty"`
	OwnerUserID    string `json:"owner_user_id,omitempty"`
}

// CreateCommissionAgreementRequest is the payload for creating a new
// commission-agreement version.
type CreateCommissionAgreementRequest struct {
	RateBps          int64  `json:"rate_bps"`
	FixedAmountCents int64  `json:"fixed_amount_cents"`
	Currency         string `json:"currency"`
	ValidFrom        string `json:"valid_from"`
}

// FinancialAuditEventResponse is one audit event for the admin listing.
type FinancialAuditEventResponse struct {
	ID        string `json:"id"`
	Entity    string `json:"entity"`
	EntityID  string `json:"entity_id"`
	Action    string `json:"action"`
	ActorID   string `json:"actor_id,omitempty"`
	ActorType string `json:"actor_type"`
	Payload   string `json:"payload,omitempty"`
	CreatedAt string `json:"created_at"`
}

// AuditEvent converts a domain audit event into its response DTO.
func AuditEvent(e *auditdomain.Event) FinancialAuditEventResponse {
	return FinancialAuditEventResponse{
		ID:        e.ID,
		Entity:    e.Entity,
		EntityID:  e.EntityID,
		Action:    e.Action,
		ActorID:   e.ActorID,
		ActorType: e.ActorType,
		Payload:   e.Payload,
		CreatedAt: e.CreatedAt,
	}
}

// dtoAlly converts a domain ally to its response DTO.
func dtoAlly(a *allydomain.Ally) *AllyResponse {
	return &AllyResponse{
		ID:             a.ID,
		OwnerUserID:    a.OwnerUserID,
		LegalName:      a.LegalName,
		CommercialName: a.CommercialName,
		Category:       a.Category,
		ContactEmail:   a.ContactEmail,
		ContactPhone:   a.ContactPhone,
		TaxID:          a.TaxID,
		Status:         a.Status,
		CreatedAt:      a.CreatedAt,
		UpdatedAt:      a.UpdatedAt,
	}
}

// dtoRelationship converts a domain relationship to its response DTO.
func dtoRelationship(r *allydomain.Relationship) *RelationshipResponse {
	return &RelationshipResponse{
		ID:           r.ID,
		CoachID:      r.CoachID,
		AllyID:       r.AllyID,
		Status:       r.Status,
		AttributedBy: r.AttributedBy,
		InvitedAt:    r.InvitedAt,
		ActivatedAt:  r.ActivatedAt,
		EndedAt:      r.EndedAt,
		CreatedAt:    r.CreatedAt,
		UpdatedAt:    r.UpdatedAt,
	}
}

// dtoMembers converts domain members to response DTOs.
func dtoMembers(members []*allydomain.AllyMember) []*AllyMemberResponse {
	out := make([]*AllyMemberResponse, len(members))
	for i, m := range members {
		out[i] = &AllyMemberResponse{
			ID:        m.ID,
			AllyID:    m.AllyID,
			UserID:    m.UserID,
			Role:      m.Role,
			CreatedAt: m.CreatedAt,
		}
	}
	return out
}

// dtoSummary converts a domain summary to its response DTO.
func dtoSummary(s *allydomain.Summary) AllySummaryResponse {
	return AllySummaryResponse{
		RelationshipID: s.RelationshipID,
		CoachID:        s.CoachID,
		AllyID:         s.AllyID,
		LegalName:      s.LegalName,
		CommercialName: s.CommercialName,
		Category:       s.Category,
		Status:         s.Status,
	}
}

// dtoAgreement converts a domain agreement to its response DTO.
func dtoAgreement(a *commissiondomain.Agreement) *CommissionAgreementResponse {
	validTo := ""
	if a.ValidTo != nil {
		validTo = *a.ValidTo
	}
	return &CommissionAgreementResponse{
		ID:               a.ID,
		RelationshipID:   a.RelationshipID,
		Version:          a.Version,
		RateBps:          a.RateBps,
		FixedAmountCents: a.FixedAmountCents,
		EligibleBaseRule: a.EligibleBaseRule,
		Rounding:         a.Rounding,
		Currency:         a.Currency,
		ValidFrom:        a.ValidFrom,
		ValidTo:          validTo,
		Status:           a.Status,
		AcceptedBy:       a.AcceptedBy,
		AcceptedAt:       a.AcceptedAt,
		CreatedAt:        a.CreatedAt,
	}
}
