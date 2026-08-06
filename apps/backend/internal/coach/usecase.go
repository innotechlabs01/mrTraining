package coach

import (
	"context"

	"github.com/google/uuid"
	"github.com/mrtraining/backend/internal/athlete"
	"github.com/mrtraining/backend/pkg/apperror"
)

type UseCases struct {
	repo        Repository
	athleteRepo athlete.Repository
}

func NewUseCases(repo Repository, athleteRepo athlete.Repository) *UseCases {
	return &UseCases{repo: repo, athleteRepo: athleteRepo}
}

type CoachProfileResponse struct {
	ID             string   `json:"id"`
	UserID         string   `json:"user_id"`
	Specializations []string `json:"specializations"`
	Certifications []string `json:"certifications"`
	CertLevel      string   `json:"cert_level"`
	Bio            string   `json:"bio"`
	ExperienceYears int     `json:"experience_years"`
	WebsiteURL     string   `json:"website_url"`
	InstagramHandle string   `json:"instagram_handle"`
	YoutubeHandle  string   `json:"youtube_handle"`
	AthleteCount   int      `json:"athlete_count"`
	MaxAthletes    int      `json:"max_athletes"`
	IsVerified     bool     `json:"is_verified"`
	Status         string   `json:"status"`
}

type UpdateProfileCommand struct {
	Specializations  []string `json:"specializations"`
	CertLevel        string   `json:"cert_level"`
	Bio              string   `json:"bio"`
	WebsiteURL       string   `json:"website_url"`
	InstagramHandle  string   `json:"instagram_handle"`
	YoutubeHandle    string   `json:"youtube_handle"`
}

func (uc *UseCases) GetProfile(ctx context.Context, userID, orgID string) (*CoachProfileResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("user_id", "must be a valid UUID")
	}
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}

	c, err := uc.repo.FindByUserID(ctx, uid, orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}
	if c == nil {
		return nil, apperror.ErrNotFound("coach profile")
	}

	return &CoachProfileResponse{
		ID:              c.ID().String(),
		UserID:          c.UserID().String(),
		Specializations: c.Specializations(),
		Certifications:  c.Certifications(),
		CertLevel:       string(c.CertLevel()),
		Bio:             c.Bio(),
		ExperienceYears: c.ExperienceYears(),
		WebsiteURL:      c.WebsiteURL(),
		InstagramHandle: c.InstagramHandle(),
		YoutubeHandle:   c.YoutubeHandle(),
		AthleteCount:    c.AthleteCount(),
		MaxAthletes:     c.MaxAthletes(),
		IsVerified:      c.IsVerified(),
		Status:          string(c.Status()),
	}, nil
}

func (uc *UseCases) UpdateProfile(ctx context.Context, userID, orgID string, cmd UpdateProfileCommand) (*CoachProfileResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("user_id", "must be a valid UUID")
	}
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}

	c, err := uc.repo.FindByUserID(ctx, uid, orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}
	if c == nil {
		return nil, apperror.ErrNotFound("coach profile")
	}

	c.UpdateProfile(cmd.Specializations, CertificationLevel(cmd.CertLevel), cmd.Bio, cmd.WebsiteURL, cmd.InstagramHandle, cmd.YoutubeHandle)

	if err := uc.repo.Save(ctx, c); err != nil {
		return nil, apperror.ErrInternal(err)
	}

	return uc.GetProfile(ctx, userID, orgID)
}

type AssignAthleteCommand struct {
	AthleteUserID string `json:"athlete_user_id"`
}

type AthleteBriefResponse struct {
	ID       string `json:"id"`
	UserID   string `json:"user_id"`
	Sport    string `json:"sport"`
	Status   string `json:"status"`
	CoachID  string `json:"coach_id,omitempty"`
}

func (uc *UseCases) AssignAthlete(ctx context.Context, coachUserID, orgID string, cmd AssignAthleteCommand) error {
	coachUUID, err := uuid.Parse(coachUserID)
	if err != nil {
		return apperror.ErrInvalidInput("coach_user_id", "must be a valid UUID")
	}
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}
	athleteUUID, err := uuid.Parse(cmd.AthleteUserID)
	if err != nil {
		return apperror.ErrInvalidInput("athlete_user_id", "must be a valid UUID")
	}

	coach, err := uc.repo.FindByUserID(ctx, coachUUID, orgUUID)
	if err != nil {
		return apperror.ErrInternal(err)
	}
	if coach == nil {
		return apperror.ErrNotFound("coach profile")
	}

	a, err := uc.athleteRepo.FindByUserID(ctx, athleteUUID, orgUUID)
	if err != nil {
		return apperror.ErrInternal(err)
	}
	if a == nil {
		return apperror.ErrNotFound("athlete profile")
	}

	a.AssignCoach(coach.ID())
	if err := uc.athleteRepo.Save(ctx, a); err != nil {
		return apperror.ErrInternal(err)
	}

	return nil
}

func (uc *UseCases) ListAthletes(ctx context.Context, coachUserID, orgID string) ([]AthleteBriefResponse, error) {
	coachUUID, err := uuid.Parse(coachUserID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("coach_user_id", "must be a valid UUID")
	}
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}

	coach, err := uc.repo.FindByUserID(ctx, coachUUID, orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}
	if coach == nil {
		return nil, apperror.ErrNotFound("coach profile")
	}

	athletes, err := uc.athleteRepo.FindByCoach(ctx, coach.ID(), orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}

	resp := make([]AthleteBriefResponse, 0, len(athletes))
	for _, a := range athletes {
		coachID := ""
		if a.CoachID() != nil {
			coachID = a.CoachID().String()
		}
		resp = append(resp, AthleteBriefResponse{
			ID:      a.ID().String(),
			UserID:  a.UserID().String(),
			Sport:   a.PrimarySport(),
			Status:  string(a.TrainingStatus()),
			CoachID: coachID,
		})
	}

	return resp, nil
}
