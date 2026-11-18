// Package handlers provides HTTP handlers for the platform administration
// (read-only MVP) vertical slice.
package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	trmapp "github.com/innotechlabs01/mr-training-api/internal/application/trm"

	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// trmReader is the subset of trm.Service used by the admin handler.
type trmReader interface {
	GetCurrent(context.Context) (*trmapp.Rate, error)
	GetStored(context.Context) (*trmapp.Rate, error)
}

// AdminHandler handles read-only platform administration endpoints. It never
// exposes athlete private data: only aggregated counts are returned.
type AdminHandler struct {
	db          *sql.DB
	clerkClient clerkMetadataUpdater
	trmService  trmReader
}

// clerkMetadataUpdater es el subconjunto de ClerkClient usado por AdminHandler.
type clerkMetadataUpdater interface {
	UpdatePublicMetadata(ctx context.Context, userID string, metadata map[string]interface{}) error
}

// NewAdminHandler creates a new AdminHandler bound to the supplied database.
// A nil database keeps the handler functional for degraded health reporting.
func NewAdminHandler(db *sql.DB, clerkClient clerkMetadataUpdater, trmService trmReader) *AdminHandler {
	return &AdminHandler{db: db, clerkClient: clerkClient, trmService: trmService}
}

// AdminDashboardResponse is the aggregated, tenant-agnostic dashboard payload.
type AdminDashboardResponse struct {
	CoachesCount         int64 `json:"coaches_count"`
	ActiveCoachesCount   int64 `json:"active_coaches_count"`
	UsersCount           int64 `json:"users_count"`
	MembershipsCount     int64 `json:"memberships_count"`
	ActiveMemberships    int64 `json:"active_memberships_count"`
	LinkedAthletes       int64 `json:"linked_athletes_count"`
	ExpiringCoachesCount int64 `json:"expiring_coaches_count"`
	SkippedSubscriptions int64 `json:"skipped_subscriptions"`
}

// AdminCoachSummary is a privacy-safe coach row (no athlete identities).
// ID es el identificador público (puede ser un Clerk users.id). CoachID es el
// identificador interno de la tabla coaches, garantizado y separado de ID.
type AdminCoachSummary struct {
	ID                string  `json:"id"`
	CoachID           string  `json:"coach_id"`
	Name              string  `json:"name"`
	Email             string  `json:"email"`
	IsActive          bool    `json:"is_active"`
	AthletesCount     int64   `json:"athletes_count"`
	MembershipsCount  int64   `json:"memberships_count"`
	ActiveMemberships int64   `json:"active_memberships_count"`
	CreatedAt         string  `json:"created_at"`
	PlanName          string  `json:"plan_name"`
	PlanPrice         float64 `json:"plan_price"`
	PlanMaxAthletes   int     `json:"plan_max_athletes"`
	PlanStatus        string  `json:"plan_status"`
	PlanExpiresAt     string  `json:"plan_expires_at"`
	RevenueMonth      float64 `json:"revenue_month"`
	RevenueTotal      float64 `json:"revenue_total"`
	SkipSubscription  bool    `json:"skip_subscription"`
	LastLogin         string  `json:"last_login"`
}

// AdminCoachesResponse wraps a paginated, privacy-safe coach listing.
type AdminCoachesResponse struct {
	Data     []AdminCoachSummary `json:"data"`
	Search   string              `json:"search"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"page_size"`
	Total    int64               `json:"total"`
}

// AdminCoachDetailResponse contains aggregate coach information only.
type AdminCoachDetailResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	IsActive          bool   `json:"is_active"`
	AthletesCount     int64  `json:"athletes_count"`
	MembershipsCount  int64  `json:"memberships_count"`
	ActiveMemberships int64  `json:"active_memberships_count"`
	CreatedAt         string `json:"created_at"`
	SkipSubscription  bool   `json:"skip_subscription"`
}

// AdminServiceHealthResponse reports basic dependency health.
type AdminServiceHealthResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
}

// AdminPlan is a platform plan exposed to the admin CRM.
type AdminPlan struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Description        string  `json:"description"`
	Price              float64 `json:"price"`
	Currency           string  `json:"currency"`
	BillingPeriod      string  `json:"billing_period"`
	MaxAthletes        int     `json:"max_athletes"`
	MaxSessionsPerWeek int     `json:"max_sessions_per_week"`
	IsActive           bool    `json:"is_active"`
	AthleteCount       int     `json:"athlete_count"`
	CoachID            string  `json:"coach_id"`
	CoachName          string  `json:"coach_name,omitempty"`
	TRM                float64 `json:"trm"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          *string `json:"updated_at,omitempty"`
}

// AdminPlansResponse wraps a plan listing.
type AdminPlansResponse struct {
	Data  []AdminPlan `json:"data"`
	Total int         `json:"total"`
}

// CreateAdminPlanRequest is the payload for creating a plan from the admin CRM.
type CreateAdminPlanRequest struct {
	Name               string  `json:"name"`
	Description        string  `json:"description"`
	Price              float64 `json:"price"`
	Currency           string  `json:"currency"`
	BillingPeriod      string  `json:"billing_period"`
	MaxAthletes        int     `json:"max_athletes"`
	MaxSessionsPerWeek int     `json:"max_sessions_per_week"`
	IsActive           bool    `json:"is_active"`
	CoachID            string  `json:"coach_id"`
	TRM                float64 `json:"trm"`
}

// UpdateAdminPlanRequest is the payload for updating a plan (all fields optional).
type UpdateAdminPlanRequest struct {
	Name               *string  `json:"name,omitempty"`
	Description        *string  `json:"description,omitempty"`
	Price              *float64 `json:"price,omitempty"`
	Currency           *string  `json:"currency,omitempty"`
	BillingPeriod      *string  `json:"billing_period,omitempty"`
	MaxAthletes        *int     `json:"max_athletes,omitempty"`
	MaxSessionsPerWeek *int     `json:"max_sessions_per_week,omitempty"`
	IsActive           *bool    `json:"is_active,omitempty"`
	TRM                *float64 `json:"trm,omitempty"`
}

// AdminSettingsResponse is the platform settings payload (flat key -> value).
type AdminSettingsResponse struct {
	Settings map[string]interface{} `json:"settings"`
}

// TRMSettingResponse is the payload for GET /api/v1/admin/settings/trm.
type TRMSettingResponse struct {
	Value         float64 `json:"value"`
	VigenciaDesde string  `json:"vigencia_desde"`
	FetchedAt     string  `json:"fetched_at"`
	MarginPct     int     `json:"margin_pct"`
	Source        string  `json:"source"`
}

// UpsertSettingRequest sets a single platform setting.
type UpsertSettingRequest struct {
	Key   string      `json:"key"`
	Value interface{} `json:"value"`
}

// GetDashboard handles GET /api/v1/admin/dashboard.
func (h *AdminHandler) GetDashboard(c *fiber.Ctx) error {
	resp := AdminDashboardResponse{}
	if h.db == nil {
		return appresponse.Success(c, resp)
	}

	ctx := c.Context()

	// Fuente de verdad: todos los coaches, ya sea que tengan fila en coaches
	// o solo en users (role = coach). UNION dedupe los que están en ambas.
	// Nunca devolvemos 0 silenciosamente si la DB falla.
	if err := h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM (
			SELECT id FROM users WHERE role = 'coach'
			UNION
			SELECT id FROM coaches
		) all_coaches
	`).Scan(&resp.CoachesCount); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count coaches: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar los coaches")
	}
	if err := h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM (
			SELECT id FROM users WHERE role = 'coach' AND is_active
			UNION
			SELECT id FROM coaches WHERE is_active = 1
		) active_coaches
	`).Scan(&resp.ActiveCoachesCount); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count active coaches: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar los coaches activos")
	}
	if err := h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&resp.UsersCount); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count users: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar los usuarios")
	}
	if err := h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM athlete_memberships`).Scan(&resp.MembershipsCount); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count memberships: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar las membresías")
	}
	if err := h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM athlete_memberships WHERE status = 'active'`).Scan(&resp.ActiveMemberships); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count active memberships: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar las membresías activas")
	}
	if err := h.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT athlete_id) FROM coach_athlete_links`).Scan(&resp.LinkedAthletes); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count linked athletes: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar los atletas vinculados")
	}

	// Coaches con plan expirando en los próximos 7 días (suscripción activa).
	if err := h.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT c.id)
		FROM coaches c
		JOIN subscriptions s ON s.coach_id = c.id
		WHERE s.status = 'active'
		  AND s.current_period_end::timestamp BETWEEN NOW() AND NOW() + interval '7 days'
	`).Scan(&resp.ExpiringCoachesCount); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count expiring coaches: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar los coaches por vencer")
	}

	// Suscripciones omitidas (coaches con skip_subscription = true).
	if err := h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM coaches WHERE skip_subscription = true`).Scan(&resp.SkippedSubscriptions); err != nil {
		fmt.Fprintf(os.Stderr, "[admin dashboard] count skipped subscriptions: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron contar las suscripciones omitidas")
	}

	return appresponse.Success(c, resp)
}

// ListCoaches handles GET /api/v1/admin/coaches?search=&page=.
func (h *AdminHandler) ListCoaches(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Success(c, AdminCoachesResponse{Data: []AdminCoachSummary{}})
	}

	search := strings.TrimSpace(c.Query("search"))
	page := c.QueryInt("page", 1)
	if page < 1 {
		page = 1
	}
	pageSize := 25
	offset := (page - 1) * pageSize

	items, total, err := h.queryCoaches(c.Context(), search, pageSize, offset)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to list coaches")
	}
	if items == nil {
		items = []AdminCoachSummary{}
	}

	return appresponse.Success(c, AdminCoachesResponse{
		Data:     items,
		Search:   search,
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	})
}

// GetCoach handles GET /api/v1/admin/coaches/:id.
func (h *AdminHandler) GetCoach(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}

	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach id is required")
	}

	ctx := c.Context()
	var item AdminCoachDetailResponse
	var isActive int
	err := h.db.QueryRowContext(ctx, `
		SELECT c.id, c.name, c.email, c.is_active, c.created_at,
		       c.skip_subscription
		FROM coaches c WHERE c.id = $1`, id).Scan(
		&item.ID, &item.Name, &item.Email, &isActive, &item.CreatedAt,
		&item.SkipSubscription)
	if err == sql.ErrNoRows {
		return appresponse.Error(c, fiber.StatusNotFound, "coach not found")
	}
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to load coach")
	}
	item.IsActive = isActive != 0

	_ = h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM (
		  SELECT athlete_id FROM coach_athlete_links WHERE coach_id = $1 AND status = 'active'
		  UNION
		  SELECT id FROM coach_athletes WHERE coach_id = $1
		) roster
	`, id).Scan(&item.AthletesCount)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM athlete_memberships WHERE coach_id = $1`, id).Scan(&item.MembershipsCount)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM athlete_memberships WHERE coach_id = $1 AND status = 'active'`, id).Scan(&item.ActiveMemberships)

	return appresponse.Success(c, item)
}

// GetServicesHealth handles GET /api/v1/admin/services/health.
func (h *AdminHandler) GetServicesHealth(c *fiber.Ctx) error {
	resp := AdminServiceHealthResponse{
		Status:   "healthy",
		Services: map[string]string{},
	}
	if h.db == nil {
		resp.Status = "degraded"
		resp.Services["database"] = "unavailable"
		return appresponse.Success(c, resp)
	}
	if err := h.db.Ping(); err != nil {
		resp.Status = "degraded"
		resp.Services["database"] = "unhealthy: " + err.Error()
		return appresponse.Success(c, resp)
	}
	resp.Services["database"] = "healthy"
	return appresponse.Success(c, resp)
}

// Aliases for callers/tests that use alternate naming.
func (h *AdminHandler) GetCoachByID(c *fiber.Ctx) error     { return h.GetCoach(c) }
func (h *AdminHandler) ServiceHealth(c *fiber.Ctx) error    { return h.GetServicesHealth(c) }
func (h *AdminHandler) ServicesHealth(c *fiber.Ctx) error   { return h.GetServicesHealth(c) }
func (h *AdminHandler) GetServiceHealth(c *fiber.Ctx) error { return h.GetServicesHealth(c) }

func (h *AdminHandler) queryCoaches(ctx context.Context, search string, limit, offset int) ([]AdminCoachSummary, int64, error) {
	where := "TRUE"
	args := []interface{}{}
	if search != "" {
		where = "(ac.name ILIKE $1 OR ac.email ILIKE $1)"
		args = append(args, "%"+search+"%")
	}

	// all_coaches une coaches y users (role = coach) que no tienen fila en
	// coaches, así los coaches sin perfil de coaches (p.ej. solo en users)
	// aparecen en el listado del CRM sin romper el aislamiento por coach.
	baseCTE := `
		WITH all_coaches AS (
			SELECT c.id, c.name, c.email, c.is_active, c.created_at,
			       c.skip_subscription, c.updated_at
			FROM coaches c
			UNION
			SELECT u.id, u.name, u.email, u.is_active::integer, u.created_at,
			       false::boolean, u.updated_at
			FROM users u
			WHERE u.role = 'coach'
			  AND NOT EXISTS (
				SELECT 1 FROM coaches c2
				WHERE c2.id = u.id OR lower(c2.email) = lower(u.email)
			  )
		)
	`

	// Reparación: asegura que todo coach con rol en users tenga una fila en
	// coaches, de modo que CoachID (interno de coaches) esté siempre garantizado
	// y separado de ID (que puede ser un Clerk users.id). Idempotente.
	if _, err := h.db.ExecContext(ctx, `
		INSERT INTO coaches (id, email, name, skip_subscription, is_active, created_at, updated_at)
		SELECT gen_random_uuid(), u.email, COALESCE(NULLIF(u.name, ''), u.email), false::integer, u.is_active::integer, u.created_at, u.updated_at
		FROM users u
		WHERE u.role = 'coach'
		  AND NOT EXISTS (
			SELECT 1 FROM coaches c
			WHERE c.id = u.id OR lower(c.email) = lower(u.email)
		  )
		ON CONFLICT (id) DO NOTHING
	`); err != nil {
		return nil, 0, err
	}

	var total int64
	countQuery := baseCTE + `SELECT COUNT(*) FROM all_coaches ac WHERE ` + where
	if err := h.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append([]interface{}{}, args...)
	next := len(listArgs) + 1
	limitPH := "$" + strconv.Itoa(next)
	offsetPH := "$" + strconv.Itoa(next+1)
	listArgs = append(listArgs, limit, offset)

	query := baseCTE + `
		SELECT ac.id, ac.id AS coach_id, ac.name, ac.email, ac.is_active, ac.created_at,
		       COALESCE((
		         SELECT COUNT(*) FROM (
		           SELECT cal.athlete_id AS athlete_id FROM coach_athlete_links cal
		           WHERE cal.coach_id = ac.id AND (cal.status = 'active' OR cal.status IS NULL)
		           UNION
		           SELECT ca.id AS athlete_id FROM coach_athletes ca WHERE ca.coach_id = ac.id
		         ) roster
		       ), 0),
		       COALESCE((SELECT COUNT(*) FROM athlete_memberships am WHERE am.coach_id = ac.id), 0),
		       COALESCE((SELECT COUNT(*) FROM athlete_memberships am WHERE am.coach_id = ac.id AND am.status = 'active'), 0),
		       ac.skip_subscription,
		       COALESCE((
		         SELECT s.plan_name FROM subscriptions s
		         WHERE s.coach_id = ac.id AND s.status = 'active'
		         ORDER BY s.current_period_end DESC LIMIT 1
		       ), ''),
		       COALESCE((
		         SELECT s.plan_price FROM subscriptions s
		         WHERE s.coach_id = ac.id AND s.status = 'active'
		         ORDER BY s.current_period_end DESC LIMIT 1
		       ), 0),
		       COALESCE((
		         SELECT pl.max_athletes FROM subscriptions s
		         JOIN plans pl ON pl.id = s.plan_id
		         WHERE s.coach_id = ac.id AND s.status = 'active'
		         ORDER BY s.current_period_end DESC LIMIT 1
		       ), 0),
		       COALESCE((
		         SELECT s.status FROM subscriptions s
		         WHERE s.coach_id = ac.id AND s.status = 'active'
		         ORDER BY s.current_period_end DESC LIMIT 1
		       ), 'none'),
		       COALESCE((
		         SELECT s.current_period_end::text FROM subscriptions s
		         WHERE s.coach_id = ac.id AND s.status = 'active'
		         ORDER BY s.current_period_end DESC LIMIT 1
		       ), ''),
		       COALESCE((
		         SELECT COALESCE(SUM(l.gross_amount_cents/100.0) FILTER (
		           WHERE l.period_start::timestamp >= date_trunc('month', NOW())
		         ), 0)
		         FROM wompi_payment_ledger l
		         WHERE l.status NOT IN ('pending', 'reversed')
		           AND l.coach_id = ac.id
		       ), 0),
		       COALESCE((
		         SELECT COALESCE(SUM(l.gross_amount_cents/100.0), 0)
		         FROM wompi_payment_ledger l
		         WHERE l.status NOT IN ('pending', 'reversed')
		           AND l.coach_id = ac.id
		       ), 0),
		       ac.updated_at::text
		FROM all_coaches ac
		WHERE ` + where + `
		ORDER BY ac.created_at DESC
		LIMIT ` + limitPH + ` OFFSET ` + offsetPH

	rows, err := h.db.QueryContext(ctx, query, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]AdminCoachSummary, 0)
	for rows.Next() {
		var item AdminCoachSummary
		var isActive int
		var createdAt interface{}
		if err := rows.Scan(&item.ID, &item.CoachID, &item.Name, &item.Email, &isActive, &createdAt,
			&item.AthletesCount, &item.MembershipsCount, &item.ActiveMemberships,
			&item.SkipSubscription,
			&item.PlanName, &item.PlanPrice, &item.PlanMaxAthletes,
			&item.PlanStatus, &item.PlanExpiresAt, &item.RevenueMonth,
			&item.RevenueTotal, &item.LastLogin); err != nil {
			return nil, 0, err
		}
		item.IsActive = isActive != 0
		if createdAt != nil {
			item.CreatedAt = strings.TrimSpace(formatTimeValue(createdAt))
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// ToggleSkipSubscription handles POST /api/v1/admin/coaches/:id/skip-subscription.
// Toggles the coach's skip_subscription status and updates Clerk publicMetadata.
//
// The :id path parameter is resolved as a coaches.id (internal, tabla coaches).
// Se mantiene un fallback por users.id (Clerk ID) solo para retrocompatibilidad;
// ese fallback está deprecado y nunca se registra el valor crudo del Clerk ID en logs.
func (h *AdminHandler) ToggleSkipSubscription(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}

	ctx := c.Context()
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach id is required")
	}

	// Parse request body
	var req struct {
		SkipSubscription bool `json:"skip_subscription"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	// Resolve el coach. Primero intenta por coaches.id (canónico interno).
	// Si no existe, usa el fallback deprecado por users.id (Clerk ID) y repara
	// creando/reutilizando la fila en coaches.
	var coachID, email, name string
	var isActive int
	err := h.db.QueryRowContext(ctx, `
		SELECT id, email, COALESCE(NULLIF(name, ''), email), is_active
		FROM coaches
		WHERE id = $1
	`, id).Scan(&coachID, &email, &name, &isActive)
	if err == sql.ErrNoRows {
		// Fallback deprecado: :id es un users.id (Clerk ID).
		// users.is_active es BOOLEAN; coaches.is_active es INTEGER.
		var isActiveBool bool
		err = h.db.QueryRowContext(ctx, `
			SELECT u.id, u.email, COALESCE(NULLIF(u.name, ''), u.email), u.is_active
			FROM users u
			WHERE u.id = $1 AND u.role = 'coach'
		`, id).Scan(&coachID, &email, &name, &isActiveBool)
		if err == sql.ErrNoRows {
			// Último recurso: coincidencia por email en coaches (legacy).
			err = h.db.QueryRowContext(ctx, `
				SELECT id, email, COALESCE(NULLIF(name, ''), email), is_active
				FROM coaches
				WHERE lower(email) = lower($1)
			`, id).Scan(&coachID, &email, &name, &isActive)
			if err == sql.ErrNoRows {
				return appresponse.Error(c, fiber.StatusNotFound, "coach not found")
			}
			if err != nil {
				return appresponse.Error(c, fiber.StatusInternalServerError, "failed to look up coach")
			}
		} else if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to look up coach")
		} else {
			if isActiveBool {
				isActive = 1
			}
		}

		// Repara: asegura existencia de fila en coaches para este users.id.
		_, err = h.db.ExecContext(ctx, `
			INSERT INTO coaches (id, email, name, skip_subscription, is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
			ON CONFLICT (id) DO UPDATE SET
				email = EXCLUDED.email,
				name = EXCLUDED.name,
				is_active = EXCLUDED.is_active,
				updated_at = NOW()
		`, coachID, email, name, req.SkipSubscription, isActive)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to ensure coach row")
		}
	} else if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to look up coach")
	}

	// Actualiza skip_subscription en la tabla coaches por id interno.
	_, err = h.db.ExecContext(ctx, `
		UPDATE coaches
		SET skip_subscription = $1, updated_at = NOW()
		WHERE id = $2
	`, req.SkipSubscription, coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to update skip_subscription")
	}

	// Mantiene sincronizadas las filas legacy de coaches que comparten el email.
	if email != "" {
		_, err = h.db.ExecContext(ctx, `
			UPDATE coaches SET skip_subscription = $1, updated_at = NOW()
			WHERE email <> '' AND lower(email) = lower($2)
		`, req.SkipSubscription, email)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to sync legacy coach rows")
		}
	}

	// Actualiza Clerk publicMetadata con el estado de membresía.
	// Nunca se registra el Clerk ID crudo: solo un sufijo para diagnóstico.
	if h.clerkClient != nil && coachID != "" {
		metadata := map[string]interface{}{
			"membership_status": map[string]interface{}{
				"skip_subscription": req.SkipSubscription,
				"updated_at":        time.Now().UTC().Format(time.RFC3339),
			},
		}
		if err := h.clerkClient.UpdatePublicMetadata(c.Context(), coachID, metadata); err != nil {
			fmt.Printf("warning: failed to update Clerk publicMetadata for coach %s: %v\n", clerkIDSuffix(coachID, 8), err)
		}
	}

	return appresponse.Success(c, map[string]interface{}{
		"skip_subscription": req.SkipSubscription,
		"coach_id":          coachID,
	})
}

// ListAdminPlans handles GET /api/v1/admin/plans.
func (h *AdminHandler) ListAdminPlans(c *fiber.Ctx) error {
	resp := AdminPlansResponse{Data: []AdminPlan{}}
	if h.db == nil {
		return appresponse.Success(c, resp)
	}
	ctx := c.Context()
	rows, err := h.db.QueryContext(ctx, `
		SELECT p.id, p.name, p.description, p.price, p.currency, p.billing_period,
		       p.max_athletes, p.max_sessions_per_week, p.is_active, p.athlete_count,
		       p.coach_id, u.name AS coach_name, p.trm, p.created_at, p.updated_at
		FROM plans p
		LEFT JOIN coaches u ON u.id = p.coach_id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to list plans")
	}
	defer rows.Close()
	for rows.Next() {
		var p AdminPlan
		var coachName sql.NullString
		var updatedAt interface{}
		var isActive int
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Currency,
			&p.BillingPeriod, &p.MaxAthletes, &p.MaxSessionsPerWeek, &isActive,
			&p.AthleteCount, &p.CoachID, &coachName, &p.TRM, &p.CreatedAt, &updatedAt); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to scan plan")
		}
		p.IsActive = isActive != 0
		if coachName.Valid {
			p.CoachName = coachName.String
		}
		if updatedAt != nil {
			s := strings.TrimSpace(formatTimeValue(updatedAt))
			p.UpdatedAt = &s
		}
		resp.Data = append(resp.Data, p)
		resp.Total++
	}
	if resp.Data == nil {
		resp.Data = []AdminPlan{}
	}
	return appresponse.Success(c, resp)
}

// CreateAdminPlan handles POST /api/v1/admin/plans.
func (h *AdminHandler) CreateAdminPlan(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}
	ctx := c.Context()
	var req CreateAdminPlanRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Name == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "name is required")
	}
	if req.Price <= 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "price must be greater than 0")
	}
	if req.Currency == "" {
		req.Currency = "COP"
	}
	if req.BillingPeriod == "" {
		req.BillingPeriod = "monthly"
	}
	if req.MaxAthletes == 0 {
		req.MaxAthletes = 10
	}
	if req.MaxSessionsPerWeek == 0 {
		req.MaxSessionsPerWeek = 12
	}
	id := strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	var createdAt string
	err := h.db.QueryRowContext(ctx, `
		INSERT INTO plans (id, name, description, price, currency, billing_period,
		                   max_athletes, max_sessions_per_week, is_active, coach_id, trm,
		                   created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
		RETURNING created_at`,
		id, req.Name, req.Description, req.Price, req.Currency, req.BillingPeriod,
		req.MaxAthletes, req.MaxSessionsPerWeek, req.IsActive, req.CoachID, req.TRM).Scan(&createdAt)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to create plan")
	}
	return appresponse.Success(c, AdminPlan{
		ID:                 id,
		Name:               req.Name,
		Description:        req.Description,
		Price:              req.Price,
		Currency:           req.Currency,
		BillingPeriod:      req.BillingPeriod,
		MaxAthletes:        req.MaxAthletes,
		MaxSessionsPerWeek: req.MaxSessionsPerWeek,
		IsActive:           req.IsActive,
		CoachID:            req.CoachID,
		TRM:                req.TRM,
		CreatedAt:          createdAt,
	})
}

// UpdateAdminPlan handles PUT /api/v1/admin/plans/:id.
func (h *AdminHandler) UpdateAdminPlan(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}
	ctx := c.Context()
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "plan id is required")
	}
	var req UpdateAdminPlanRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	// Verify plan exists.
	var existing int
	if err := h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM plans WHERE id = $1`, id).Scan(&existing); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to check plan")
	}
	if existing == 0 {
		return appresponse.Error(c, fiber.StatusNotFound, "plan not found")
	}

	// Build dynamic UPDATE.
	sets := []string{}
	args := []interface{}{}
	argIdx := 1
	add := func(col string, val interface{}) {
		sets = append(sets, col+" = $"+strconv.Itoa(argIdx))
		args = append(args, val)
		argIdx++
	}
	if req.Name != nil && *req.Name != "" {
		add("name", *req.Name)
	}
	if req.Description != nil {
		add("description", *req.Description)
	}
	if req.Price != nil && *req.Price > 0 {
		add("price", *req.Price)
	}
	if req.Currency != nil {
		add("currency", *req.Currency)
	}
	if req.BillingPeriod != nil && *req.BillingPeriod != "" {
		add("billing_period", *req.BillingPeriod)
	}
	if req.MaxAthletes != nil && *req.MaxAthletes > 0 {
		add("max_athletes", *req.MaxAthletes)
	}
	if req.MaxSessionsPerWeek != nil && *req.MaxSessionsPerWeek > 0 {
		add("max_sessions_per_week", *req.MaxSessionsPerWeek)
	}
	if req.IsActive != nil {
		add("is_active", map[bool]int{true: 1, false: 0}[*req.IsActive])
	}
	if req.TRM != nil {
		add("trm", *req.TRM)
	}
	if len(sets) == 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "no fields to update")
	}
	add("updated_at", "NOW()")
	args = append(args, id)
	query := `UPDATE plans SET ` + strings.Join(sets, ", ") + ` WHERE id = $` + strconv.Itoa(argIdx)
	if _, err := h.db.ExecContext(ctx, query, args...); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to update plan")
	}
	return appresponse.Success(c, map[string]string{"id": id, "updated": "true"})
}

// DeleteAdminPlan handles DELETE /api/v1/admin/plans/:id.
func (h *AdminHandler) DeleteAdminPlan(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}
	ctx := c.Context()
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "plan id is required")
	}
	result, err := h.db.ExecContext(ctx, `DELETE FROM plans WHERE id = $1`, id)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to delete plan")
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return appresponse.Error(c, fiber.StatusNotFound, "plan not found")
	}
	return appresponse.Success(c, map[string]string{"deleted": "true", "id": id})
}

// GetSettings handles GET /api/v1/admin/settings.
func (h *AdminHandler) GetSettings(c *fiber.Ctx) error {
	resp := AdminSettingsResponse{Settings: map[string]interface{}{}}
	if h.db == nil {
		return appresponse.Success(c, resp)
	}
	ctx := c.Context()
	rows, err := h.db.QueryContext(ctx, `SELECT key, value FROM platform_settings`)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to read settings")
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var value []byte
		if err := rows.Scan(&key, &value); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to scan setting")
		}
		var v interface{}
		if err := json.Unmarshal(value, &v); err != nil {
			resp.Settings[key] = string(value)
		} else {
			resp.Settings[key] = v
		}
	}
	if resp.Settings == nil {
		resp.Settings = map[string]interface{}{}
	}
	return appresponse.Success(c, resp)
}

// PutSettings handles PUT /api/v1/admin/settings. Upserts one or several settings
// from a flat object (e.g. { "platformName": "MR Training" }) or a single
// { key, value } payload.
func (h *AdminHandler) PutSettings(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}
	ctx := c.Context()

	var raw map[string]interface{}
	if err := c.BodyParser(&raw); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if len(raw) == 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "no settings provided")
	}

	// Support both flat object { key: value } and single { key, value }.
	if k, ok := raw["key"]; ok && len(raw) <= 2 {
		key, _ := k.(string)
		if key == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "setting key is required")
		}
		raw = map[string]interface{}{key: raw["value"]}
	}

	for key, val := range raw {
		value, err := json.Marshal(val)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to serialize setting value")
		}
		_, err = h.db.ExecContext(ctx, `
			INSERT INTO platform_settings (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
		`, key, value)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save setting")
		}
	}
	return appresponse.Success(c, AdminSettingsResponse{Settings: raw})
}

// GetTRMSetting handles GET /api/v1/admin/settings/trm.
// Devuelve la TRM con margen del 8% aplicado, vigencia y fecha de actualización.
func (h *AdminHandler) GetTRMSetting(c *fiber.Ctx) error {
	ctx := c.Context()

	var rate *trmapp.Rate
	var err error
	if h.trmService != nil {
		rate, err = h.trmService.GetCurrent(ctx)
		if err != nil {
			// Si el servicio falla, intentar leer el valor persistido en DB.
			rate, err = h.trmService.GetStored(ctx)
		}
	}
	if err != nil || rate == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "trm unavailable")
	}

	return appresponse.Success(c, TRMSettingResponse{
		Value:         rate.Value,
		VigenciaDesde: rate.VigenciaD,
		FetchedAt:     rate.FetchedAt.UTC().Format(time.RFC3339),
		MarginPct:     rate.MarginPct,
		Source:        rate.Source,
	})
}

// clerkIDSuffix returns the last n characters of a Clerk id, or the whole id
// when it is shorter than n. It never panics on a short/empty id.
func clerkIDSuffix(clerkID string, n int) string {
	if len(clerkID) <= n {
		return clerkID
	}
	return clerkID[len(clerkID)-n:]
}

func formatTimeValue(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case sql.NullString:
		if t.Valid {
			return t.String
		}
	case []byte:
		return string(t)
	}
	return ""
}
