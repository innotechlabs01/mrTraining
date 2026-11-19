package middleware

import (
	"context"
	"database/sql"
)

// CoachPlanCapacity is the platform plan capacity of a coach.
type CoachPlanCapacity struct {
	PlanName      string
	MaxAthletes   int
	AthletesCount int
	Exceeded      bool
}

// GetCoachPlanCapacity resolves the coach's active platform subscription
// (athlete_id = coach_id) and counts their active athletes.
//
// The plan limit is a platform-plan limit: plans.max_athletes is the maximum
// number of athletes the coach can train. A coach with no active platform
// subscription has no enforceable limit here (max = 0), so access is not
// blocked by this check.
//
// coachID may be users.id (canonical) or coaches.id (legacy). Both are
// accepted by resolving the matching coaches/users rows by email.
func GetCoachPlanCapacity(ctx context.Context, db *sql.DB, coachID string) (CoachPlanCapacity, error) {
	capacity := CoachPlanCapacity{}
	if db == nil || coachID == "" {
		return capacity, nil
	}

	// Count the coach's real roster: athletes with a linked account plus the
	// roster entries created from the coach UI. Both count toward the plan
	// limit, so adding or deleting an athlete updates the number immediately.
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM (
		  SELECT cal.athlete_id AS athlete_id
		  FROM coach_athlete_links cal
		  WHERE cal.status = 'active'
		    AND (
		      cal.coach_id = $1
		      OR cal.coach_id IN (
		        SELECT u2.id FROM users u2
		        WHERE u2.email <> ''
		          AND lower(u2.email) = (SELECT lower(email) FROM users WHERE id = $1)
		      )
		      OR cal.coach_id IN (
		        SELECT u.id FROM users u
		        JOIN coaches c ON c.email <> '' AND lower(c.email) = lower(u.email)
		        WHERE c.id = $1
		      )
		      OR cal.coach_id IN (
		        SELECT c.id FROM coaches c
		        JOIN users u ON u.email <> '' AND lower(u.email) = lower(c.email)
		        WHERE u.id = $1
		      )
		    )
		  UNION
		  SELECT ca.id AS athlete_id
		  FROM coach_athletes ca
		  WHERE (
		    ca.coach_id = $1
		    OR ca.coach_id IN (
		      SELECT u2.id FROM users u2
		      WHERE u2.email <> ''
		        AND lower(u2.email) = (SELECT lower(email) FROM users WHERE id = $1)
		    )
		    OR ca.coach_id IN (
		      SELECT u.id FROM users u
		      JOIN coaches c ON c.email <> '' AND lower(c.email) = lower(u.email)
		      WHERE c.id = $1
		    )
		    OR ca.coach_id IN (
		      SELECT c.id FROM coaches c
		      JOIN users u ON u.email <> '' AND lower(u.email) = lower(c.email)
		      WHERE u.id = $1
		    )
		  )
		) roster
	`, coachID).Scan(&capacity.AthletesCount); err != nil {
		return capacity, err
	}

	// The coach's own platform subscription, not an athlete subscription that
	// happens to have this coach_id.
	err := db.QueryRowContext(ctx, `
		SELECT COALESCE(NULLIF(s.plan_name, ''), p.name), p.max_athletes
		FROM subscriptions s
		JOIN plans p ON p.id = s.plan_id
		WHERE s.athlete_id <> ''
		  AND s.status IN ('active', 'trial', 'past_due')
		  AND (
		    -- The coach is the subscriber of their own platform plan. Do not
		    -- require athlete_id = coach_id: legacy subscriptions can keep a
		    -- different coaches.id while the payer is still the coach's user id.
		    s.athlete_id = $1
		    OR s.athlete_id IN (
		      SELECT u2.id FROM users u2
		      WHERE u2.email <> ''
		        AND lower(u2.email) = (SELECT lower(email) FROM users WHERE id = $1)
		    )
		    OR s.athlete_id IN (
		      SELECT c.id FROM coaches c
		      JOIN users u ON u.email <> '' AND lower(u.email) = lower(c.email)
		      WHERE u.id = $1
		    )
		  )
		ORDER BY s.current_period_end DESC
		LIMIT 1
	`, coachID).Scan(&capacity.PlanName, &capacity.MaxAthletes)
	if err == sql.ErrNoRows {
		// A paid checkout that has not become a subscription yet still carries
		// the plan and its athlete limit.
		err = db.QueryRowContext(ctx, `
			SELECT pc.plan_name, p.max_athletes
			FROM pending_checkouts pc
			JOIN plans p ON p.id = pc.plan_id
			WHERE pc.email <> ''
			  AND lower(pc.email) = (SELECT lower(email) FROM users WHERE id = $1)
			  AND pc.status IN ('paid', 'claimed')
			ORDER BY pc.updated_at DESC
			LIMIT 1
		`, coachID).Scan(&capacity.PlanName, &capacity.MaxAthletes)
		if err == sql.ErrNoRows {
			return capacity, nil
		}
	}
	if err != nil {
		return capacity, err
	}

	capacity.Exceeded = capacity.MaxAthletes > 0 && capacity.AthletesCount > capacity.MaxAthletes
	return capacity, nil
}
