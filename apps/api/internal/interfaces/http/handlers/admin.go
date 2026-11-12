// Package handlers provides HTTP handlers for the platform administration
// (read-only MVP) vertical slice.
package handlers

import (
	"context"
	"database/sql"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AdminHandler handles read-only platform administration endpoints. It never
// exposes athlete private data: only aggregated counts are returned.
type AdminHandler struct {
	db *sql.DB
}

// NewAdminHandler creates a new AdminHandler bound to the supplied database.
// A nil database keeps the handler functional for degraded health reporting.
func NewAdminHandler(db *sql.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// AdminDashboardResponse is the aggregated, tenant-agnostic dashboard payload.
type AdminDashboardResponse struct {
	CoachesCount       int64 `json:"coaches_count"`
	ActiveCoachesCount int64 `json:"active_coaches_count"`
	UsersCount         int64 `json:"users_count"`
	MembershipsCount   int64 `json:"memberships_count"`
	ActiveMemberships  int64 `json:"active_memberships_count"`
	LinkedAthletes     int64 `json:"linked_athletes_count"`
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
}

// AdminServiceHealthResponse reports basic dependency health.
type AdminServiceHealthResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
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
		SELECT id, name, email, is_active, created_at
		FROM coaches WHERE id = $1`, id).Scan(
		&item.ID, &item.Name, &item.Email, &isActive, &item.CreatedAt)
	if err == sql.ErrNoRows {
		return appresponse.Error(c, fiber.StatusNotFound, "coach not found")
	}
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to load coach")
	}
	item.IsActive = isActive == 1 || isActive != 0 && isActive == 1
	// Keep comparison explicit for integer-backed booleans.
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
		where = "(name ILIKE $1 OR email ILIKE $1)"
		args = append(args, "%"+search+"%")
	}

	var total int64
	countQuery := "SELECT COUNT(*) FROM coaches WHERE " + where
	if err := h.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append([]interface{}{}, args...)
	next := len(listArgs) + 1
	limitPH := "$" + strconv.Itoa(next)
	offsetPH := "$" + strconv.Itoa(next+1)
	listArgs = append(listArgs, limit, offset)

	query := `
		SELECT id, name, email, is_active, created_at,
		       COALESCE((SELECT COUNT(*) FROM coach_athlete_links cal WHERE cal.coach_id = coaches.id AND (cal.status = 'active' OR cal.status IS NULL)), 0),
		       COALESCE((SELECT COUNT(*) FROM athlete_memberships am WHERE am.coach_id = coaches.id), 0),
		       COALESCE((SELECT COUNT(*) FROM athlete_memberships am WHERE am.coach_id = coaches.id AND am.status = 'active'), 0)
		FROM coaches
		WHERE ` + where + `
		ORDER BY created_at DESC
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
			&item.AthletesCount, &item.MembershipsCount, &item.ActiveMemberships); err != nil {
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
