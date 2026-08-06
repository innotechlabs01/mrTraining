package athlete

import (
	"context"

	"github.com/google/uuid"
	"github.com/mrtraining/backend/pkg/apperror"
)

type UseCases struct {
	repo Repository
}

func NewUseCases(repo Repository) *UseCases {
	return &UseCases{repo: repo}
}

type AthleteProfileResponse struct {
	ID              string   `json:"id"`
	UserID          string   `json:"user_id"`
	PrimarySport    string   `json:"primary_sport"`
	ExperienceLevel string   `json:"experience_level"`
	HeightCm        *float64 `json:"height_cm,omitempty"`
	WeightKg        *float64 `json:"weight_kg,omitempty"`
	BodyFatPct      *float64 `json:"body_fat_pct,omitempty"`
	InjuryStatus    string   `json:"injury_status"`
	TrainingStatus  string   `json:"training_status"`
	Goals           []string `json:"goals"`
	CoachID         *string  `json:"coach_id,omitempty"`
}

type UpdateProfileCommand struct {
	PrimarySport    string   `json:"primary_sport"`
	ExperienceLevel string   `json:"experience_level"`
	HeightCm        *float64 `json:"height_cm,omitempty"`
	WeightKg        *float64 `json:"weight_kg,omitempty"`
	BodyFatPct      *float64 `json:"body_fat_pct,omitempty"`
	InjuryStatus    string   `json:"injury_status"`
	Goals           []string `json:"goals"`
}

func (uc *UseCases) GetProfile(ctx context.Context, userID, orgID string, metadataCoachID string) (*AthleteProfileResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("user_id", "must be a valid UUID")
	}
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}

	a, err := uc.repo.FindByUserID(ctx, uid, orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}
	if a == nil {
		return nil, apperror.ErrNotFound("athlete profile")
	}

	if metadataCoachID != "" && a.CoachID() == nil {
		coachUUID, err := uuid.Parse(metadataCoachID)
		if err == nil {
			a.AssignCoach(coachUUID)
			if err := uc.repo.Save(ctx, a); err != nil {
				return nil, apperror.ErrInternal(err)
			}
		}
	}

	var coachID *string
	if a.CoachID() != nil {
		id := a.CoachID().String()
		coachID = &id
	}

	return &AthleteProfileResponse{
		ID:              a.ID().String(),
		UserID:          a.UserID().String(),
		PrimarySport:    a.PrimarySport(),
		ExperienceLevel: a.ExperienceLevel(),
		HeightCm:        a.HeightCm(),
		WeightKg:        a.WeightKg(),
		BodyFatPct:      a.BodyFatPct(),
		InjuryStatus:    string(a.InjuryStatus()),
		TrainingStatus:  string(a.TrainingStatus()),
		Goals:           a.Goals(),
		CoachID:         coachID,
	}, nil
}

func (uc *UseCases) UpdateProfile(ctx context.Context, userID, orgID string, cmd UpdateProfileCommand, metadataCoachID string) (*AthleteProfileResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("user_id", "must be a valid UUID")
	}
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}

	a, err := uc.repo.FindByUserID(ctx, uid, orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}
	if a == nil {
		// Create new profile
		a = NewAthlete(uid, orgUUID, cmd.PrimarySport, cmd.ExperienceLevel)
	}

	a.UpdateMetrics(cmd.HeightCm, cmd.WeightKg, cmd.BodyFatPct, InjuryStatus(cmd.InjuryStatus))
	if len(cmd.Goals) > 0 {
		for _, g := range cmd.Goals {
			a.AddGoal(g)
		}
	}

	if metadataCoachID != "" && a.CoachID() == nil {
		coachUUID, err := uuid.Parse(metadataCoachID)
		if err == nil {
			a.AssignCoach(coachUUID)
		}
	}

	if err := uc.repo.Save(ctx, a); err != nil {
		return nil, apperror.ErrInternal(err)
	}

	return uc.GetProfile(ctx, userID, orgID, "")
}
