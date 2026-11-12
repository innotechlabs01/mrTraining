// Package handlers ofrece handlers HTTP para el CRM de super admin.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	crmapp "github.com/innotechlabs01/mr-training-api/internal/application/crm"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CRMHandler maneja peticiones HTTP del CRM de super admin.
type CRMHandler struct {
	svc *crmapp.Service
}

// NewCRMHandler crea un nuevo handler CRM.
func NewCRMHandler(svc *crmapp.Service) *CRMHandler {
	return &CRMHandler{svc: svc}
}

// RegisterRoutes monta las rutas de CRM en el grupo API.
// Requiere rol de super admin.
func (h *CRMHandler) RegisterRoutes(api fiber.Router) {
	admin := api.Group("/admin")
	admin.Get("/coaches", h.ListCoaches)
	admin.Get("/coaches/expiring", h.GetExpiringCoaches)
	admin.Get("/coaches/expired", h.GetExpiredCoaches)
	admin.Get("/revenue", h.GetRevenueStats)
	admin.Get("/coaches/:id/payments", h.GetCoachPayments)
}

// ListCoaches maneja GET /admin/coaches.
func (h *CRMHandler) ListCoaches(c *fiber.Ctx) error {
	coaches, err := h.svc.ListCoaches(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, coaches)
}

// GetRevenueStats maneja GET /admin/revenue.
func (h *CRMHandler) GetRevenueStats(c *fiber.Ctx) error {
	stats, err := h.svc.GetRevenueStats(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, stats)
}

// GetCoachPayments maneja GET /admin/coaches/:id/payments.
func (h *CRMHandler) GetCoachPayments(c *fiber.Ctx) error {
	coachID := c.Params("id")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach ID requerido")
	}

	payments, err := h.svc.GetCoachPayments(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, payments)
}

// GetExpiringCoaches maneja GET /admin/coaches/expiring.
func (h *CRMHandler) GetExpiringCoaches(c *fiber.Ctx) error {
	coaches, err := h.svc.GetExpiringCoaches(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, coaches)
}

// GetExpiredCoaches maneja GET /admin/coaches/expired.
func (h *CRMHandler) GetExpiredCoaches(c *fiber.Ctx) error {
	coaches, err := h.svc.GetExpiredCoaches(c.Context())
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, coaches)
}
