// Package handlers provides HTTP handlers for the platform administration
// (read-only MVP) vertical slice.
package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	userinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"

	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AdminHandler handles read-only platform administration endpoints. It never
// exposes athlete private data: only aggregated counts are returned.
type AdminHandler struct {
	db         *sql.DB
	clerkClient *userinfrastructure.ClerkClient
}

// NewAdminHandler creates a new AdminHandler bound to the supplied database.
// A nil database keeps the handler functional for degraded health reporting.
func NewAdminHandler(db *sql.DB, clerkClient *userinfrastructure.ClerkClient) *AdminHandler {
	return &AdminHandler{db: db, clerkClient: clerkClient}
}

// AdminDashboardResponse is the aggregated, tenant-agnostic dashboard payload.
type AdminDashboardResponse struct {
	CoachesCount           int64 `json:"coaches_count"`
	ActiveCoachesCount     int64 `json:"active_coaches_count"`
	UsersCount             int64 `json:"users_count"`
	MembershipsCount       int64 `json:"memberships_count"`
	ActiveMemberships      int64 `json:"active_memberships_count"`
	LinkedAthletes         int64 `json:"linked_athletes_count"`
	ExpiringCoachesCount   int64 `json:"expiring_coaches_count"`
	SkippedSubscriptions   int64 `json:"skipped_subscriptions"`
}

// AdminCoachSummary is a privacy-safe coach row (no athlete identities).
type AdminCoachSummary struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	Email               string `json:"email"`
	IsActive            bool   `json:"is_active"`
	AthletesCount       int64  `json:"athletes_count"`
	MembershipsCount    int64  `json:"memberships_count"`
	ActiveMemberships   int64  `json:"active_memberships_count"`
	CreatedAt           string `json:"created_at"`
	PlanName            string `json:"plan_name"`
	PlanPrice           float64 `json:"plan_price"`
	PlanStatus          string `json:"plan_status"`
	PlanExpiresAt       string `json:"plan_expires_at"`
	SkipSubscription    bool    `json:"skip_subscription"`
}

// AdminCoachesResponse wraps a paginated, privacy-safe coach listing.
type AdminCoachesResponse struct {
	Data      []AdminCoachSummary `json:"data"`
	Search    string              `json:"search"`
	Page      int                 `json:"page"`
	PageSize  int                 `json:"page_size"`
	Total     int64               `json:"total"`
}

// AdminCoachDetailResponse contains aggregate coach information only.
type AdminCoachDetailResponse struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	Email               string `json:"email"`
	IsActive            bool   `json:"is_active"`
	AthletesCount       int64  `json:"athletes_count"`
	MembershipsCount    int64  `json:"memberships_count"`
	ActiveMemberships   int64  `json:"active_memberships_count"`
	CreatedAt           string `json:"created_at"`
	SkipSubscription    bool    `json:"skip_subscription"`
}

// AdminServiceHealthResponse reports basic dependency health.
type AdminServiceHealthResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
}

// AdminPlan is a platform plan exposed to the admin CRM.
type AdminPlan struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	Description        string     `json:"description"`
	Price              float64    `json:"price"`
	Currency           string     `json:"currency"`
	BillingPeriod      string     `json:"billing_period"`
	MaxAthletes        int        `json:"max_athletes"`
	MaxSessionsPerWeek int        `json:"max_sessions_per_week"`
	IsActive           bool       `json:"is_active"`
	AthleteCount       int        `json:"athlete_count"`
	CoachID            string     `json:"coach_id"`
	CoachName          string     `json:"coach_name,omitempty"`
	TRM                float64    `json:"trm"`
	CreatedAt          string     `json:"created_at"`
	UpdatedAt          *string    `json:"updated_at,omitempty"`
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

	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM coaches`).Scan(&resp.CoachesCount)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM coaches WHERE is_active = 1`).Scan(&resp.ActiveCoachesCount)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&resp.UsersCount)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM athlete_memberships`).Scan(&resp.MembershipsCount)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM athlete_memberships WHERE status = 'active'`).Scan(&resp.ActiveMemberships)
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT athlete_id) FROM coach_athlete_links`).Scan(&resp.LinkedAthletes)

	// Coaches con plan expi­rando en los pr´oximos 7 d´ıas
	_ = h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM coaches c
		JOIN subscriptions s ON s.coach_id = c.id AND s.status = 'active'
		WHERE s.current_period_end::timestamp BETWEEN NOW() AND NOW() + interval '7 days'
	`).Scan(&resp.ExpiringCoachesCount)

	// Suscripciones omitidas
	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM coaches WHERE skip_subscription = true`).Scan(&resp.SkippedSubscriptions)

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

	_ = h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM coach_athlete_links WHERE coach_id = $1`, id).Scan(&item.AthletesCount)
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
func (h *AdminHandler) GetCoachByID(c *fiber.Ctx) error { return h.GetCoach(c) }
func (h *AdminHandler) ServiceHealth(c *fiber.Ctx) error { return h.GetServicesHealth(c) }
func (h *AdminHandler) ServicesHealth(c *fiber.Ctx) error { return h.GetServicesHealth(c) }
func (h *AdminHandler) GetServiceHealth(c *fiber.Ctx) error { return h.GetServicesHealth(c) }

func (h *AdminHandler) queryCoaches(ctx context.Context, search string, limit, offset int) ([]AdminCoachSummary, int64, error) {
	where := "TRUE"
	args := []interface{}{}
	if search != "" {
		where = "(c.name ILIKE $1 OR c.email ILIKE $1)"
		args = append(args, "%"+search+"%")
	}

	var total int64
	countQuery := "SELECT COUNT(*) FROM coaches c LEFT JOIN users u ON u.email = c.email WHERE " + where
	if err := h.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append([]interface{}{}, args...)
	next := len(listArgs) + 1
	limitPH := "$" + strconv.Itoa(next)
	offsetPH := "$" + strconv.Itoa(next + 1)
	listArgs = append(listArgs, limit, offset)

	query := `
		SELECT c.id, c.name, c.email, c.is_active, c.created_at,
		       COALESCE((SELECT COUNT(*) FROM coach_athlete_links cal WHERE cal.coach_id = c.id AND (cal.status = 'active' OR cal.status IS NULL)), 0),
		       COALESCE((SELECT COUNT(*) FROM athlete_memberships am WHERE am.coach_id = c.id), 0),
		       COALESCE((SELECT COUNT(*) FROM athlete_memberships am WHERE am.coach_id = c.id AND am.status = 'active'), 0),
		       c.skip_subscription
		FROM coaches c
		WHERE ` + where + `
		ORDER BY c.created_at DESC
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
		if err := rows.Scan(&item.ID, &item.Name, &item.Email, &isActive, &createdAt,
			&item.AthletesCount, &item.MembershipsCount, &item.ActiveMemberships,
			&item.SkipSubscription); err != nil {
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

	// Get coach's clerk_id (users.id) from users table via email join
	var clerkID string
	err := h.db.QueryRowContext(ctx, `
		SELECT u.id FROM users u
		JOIN coaches c ON c.email = u.email
		WHERE c.id = $1
	`, id).Scan(&clerkID)

	if err != nil {
		if err == sql.ErrNoRows {
			return appresponse.Error(c, fiber.StatusNotFound, "coach not found")
		}
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to get coach clerk_id")
	}

	// Update skip_subscription in coaches table
	_, err = h.db.ExecContext(ctx, `
		UPDATE coaches SET skip_subscription = $1, updated_at = NOW() WHERE id = $2
	`, req.SkipSubscription, id)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to update skip_subscription")
	}

	// Update Clerk publicMetadata with membership status
	if h.clerkClient != nil && clerkID != "" {
		metadata := map[string]interface{}{
			"membership_status": map[string]interface{}{
				"skip_subscription": req.SkipSubscription,
				"updated_at":        time.Now().UTC().Format(time.RFC3339),
			},
		}
		if err := h.clerkClient.UpdatePublicMetadata(c.Context(), clerkID, metadata); err != nil {
			fmt.Printf("warning: failed to update Clerk publicMetadata for coach %s: %v\n", clerkID, err)
		}
	}

	return appresponse.Success(c, map[string]interface{}{
		"skip_subscription": req.SkipSubscription,
		"coach_id":          id,
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

// OnboardCoach handles POST /api/v1/admin/coach/onboard.
// Creates a coach profile for the authenticated Clerk user and upserts
// publicMetadata (role: coach, coachCode) so the frontend can read it without
// hitting the database.
func (h *AdminHandler) OnboardCoach(c *fiber.Ctx) error {
	if h.db == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
	}
	if h.clerkClient == nil {
		return appresponse.Error(c, fiber.StatusServiceUnavailable, "clerk client unavailable")
	}

	ctx := c.Context()

	var req struct {
		ClerkID   string  `json:"clerk_id"`
		Email     string  `json:"email"`
		Name      string  `json:"name"`
		PlanID    string  `json:"plan_id"`
		PlanName  string  `json:"plan_name"`
		PlanPrice float64 `json:"plan_price"`
		Currency  string  `json:"currency"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.ClerkID == "" || req.Email == "" || req.Name == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "clerk_id, email and name are required")
	}

	// Check if coach already exists
	var existingCoachID string
	err := h.db.QueryRowContext(ctx, `SELECT id FROM coaches WHERE id = $1`, req.ClerkID).Scan(&existingCoachID)
	if err == nil {
		// Coach already exists, just ensure metadata is up to date
		if h.clerkClient != nil {
			metadata := map[string]interface{}{
				"membership_status": map[string]interface{}{
					"skip_subscription": false,
					"updated_at":        time.Now().UTC().Format(time.RFC3339),
				},
			}
			_ = h.clerkClient.UpdatePublicMetadata(ctx, req.ClerkID, metadata)
		}
		return appresponse.Success(c, map[string]interface{}{
			"coach_id":   req.ClerkID,
			"coach_code": req.ClerkID,
			"created":    false,
		})
	}

	// Generate a unique coach code from the coach name plus the tail of the
	// Clerk id. The id tail is only a suffix — uniqueness comes from the
	// coach_code unique index, and the name prefix keeps the code readable.
	coachCode := strings.ToUpper(strings.ReplaceAll(req.Name, " ", "")) + strings.ToUpper(clerkIDSuffix(req.ClerkID, 8))

	// Insert coach into coaches table
	_, err = h.db.ExecContext(ctx, `
		INSERT INTO coaches (id, email, name, is_active, is_accepting_athletes, skip_subscription, coach_code, created_at, updated_at)
		VALUES ($1, $2, $3, true, true, false, $4, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			email = EXCLUDED.email,
			coach_code = COALESCE(coaches.coach_code, EXCLUDED.coach_code),
			updated_at = NOW()
	`, req.ClerkID, req.Email, req.Name, coachCode)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to create coach profile")
	}

	// Update Clerk publicMetadata with role and coachCode
	if h.clerkClient != nil {
		metadata := map[string]interface{}{
			"role":            "coach",
			"coachCode":       coachCode,
			"membership_status": map[string]interface{}{
				"skip_subscription": false,
				"updated_at":        time.Now().UTC().Format(time.RFC3339),
			},
		}
		if err := h.clerkClient.UpdatePublicMetadata(ctx, req.ClerkID, metadata); err != nil {
			fmt.Printf("warning: failed to update Clerk publicMetadata for coach %s: %v\n", req.ClerkID, err)
		}
	}

	return appresponse.Success(c, map[string]interface{}{
		"coach_id":   req.ClerkID,
		"coach_code": coachCode,
		"created":      true,
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
