package coach

import (
	"time"

	"github.com/google/uuid"
)

type CoachStatus string

const (
	CoachStatusActive    CoachStatus = "active"
	CoachStatusInactive  CoachStatus = "inactive"
	CoachStatusSuspended CoachStatus = "suspended"
)

type CertificationLevel string

const (
	CertLevelBeginner    CertificationLevel = "beginner"
	CertLevelIntermediate CertificationLevel = "intermediate"
	CertLevelAdvanced     CertificationLevel = "advanced"
	CertLevelMaster       CertificationLevel = "master"
)

type Coach struct {
	id               uuid.UUID
	userID           uuid.UUID
	organizationID   uuid.UUID
	specializations  []string
	certifications   []string
	certLevel        CertificationLevel
	bio              string
	experienceYears  int
	websiteURL       string
	instagramHandle  string
	youtubeHandle    string
	athleteCount     int
	maxAthletes      int
	isVerified       bool
	status           CoachStatus
	createdAt        time.Time
	updatedAt        time.Time
	domainEvents     []DomainEvent
}

func NewCoach(userID, orgID uuid.UUID, experienceYears int) *Coach {
	return &Coach{
		id:              uuid.New(),
		userID:          userID,
		organizationID:  orgID,
		experienceYears: experienceYears,
		status:          CoachStatusActive,
		maxAthletes:     50,
		createdAt:       time.Now(),
		updatedAt:       time.Now(),
	}
}

func (c *Coach) UpdateProfile(specializations []string, certLevel CertificationLevel, bio, website, instagram, youtube string) {
	c.specializations = specializations
	c.certLevel = certLevel
	c.bio = bio
	c.websiteURL = website
	c.instagramHandle = instagram
	c.youtubeHandle = youtube
	c.updatedAt = time.Now()
}

func (c *Coach) AddCertification(cert string) {
	c.certifications = append(c.certifications, cert)
	c.updatedAt = time.Now()
}

func (c *Coach) SetVerification(isVerified bool) {
	c.isVerified = isVerified
	c.updatedAt = time.Now()
}

func (c *Coach) DomainEvents() []DomainEvent {
	return c.domainEvents
}

func (c *Coach) ClearEvents() {
	c.domainEvents = nil
}

func (c *Coach) raiseEvent(event DomainEvent) {
	c.domainEvents = append(c.domainEvents, event)
}

func (c *Coach) ID() uuid.UUID { return c.id }
func (c *Coach) UserID() uuid.UUID { return c.userID }
func (c *Coach) OrganizationID() uuid.UUID { return c.organizationID }
func (c *Coach) Specializations() []string { return c.specializations }
func (c *Coach) Certifications() []string { return c.certifications }
func (c *Coach) CertLevel() CertificationLevel { return c.certLevel }
func (c *Coach) Bio() string { return c.bio }
func (c *Coach) ExperienceYears() int { return c.experienceYears }
func (c *Coach) WebsiteURL() string { return c.websiteURL }
func (c *Coach) InstagramHandle() string { return c.instagramHandle }
func (c *Coach) YoutubeHandle() string { return c.youtubeHandle }
func (c *Coach) AthleteCount() int { return c.athleteCount }
func (c *Coach) MaxAthletes() int { return c.maxAthletes }
func (c *Coach) IsVerified() bool { return c.isVerified }
func (c *Coach) Status() CoachStatus { return c.status }
func (c *Coach) CreatedAt() time.Time { return c.createdAt }
func (c *Coach) UpdatedAt() time.Time { return c.updatedAt }
