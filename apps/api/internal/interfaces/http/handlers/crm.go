// Package handlers ofrece handlers HTTP para el CRM de super admin.
package handlers

import (
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"

	crmapp "github.com/innotechlabs01/mr-training-api/internal/application/crm"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CRMHandler maneja peticiones HTTP del CRM de super admin.
type CRMHandler struct {
	svc    *crmapp.Service
	allowed []interface{}
}

// NewCRMHandler crea un nuevo handler CRM con la allowlist de super admins.
func NewCRMHandler(svc *crmapp.Service, allowed ...interface{}) *CRMHandler {
	h := &CRMHandler{svc: svc}
	h.allowed = append(h.allowed, allowed...)
	return h
}

// RegisterRoutes monta las rutas de CRM en el grupo API.
// Todas las rutas requieren rol de super admin.
func (h *CRMHandler) RegisterRoutes(api fiber.Router) {
	admin := api.Group("/admin")
	admin.Use(middleware.RequirePlatformSuperAdmin(h.allowed...))
	admin.Get("/coaches", h.ListCoaches)
	admin.Get("/coaches/expiring", h.GetExpiringCoaches)
	admin.Get("/coaches/expired", h.GetExpiredCoaches)
	admin.Get("/revenue", h.GetRevenueStats)
	admin.Get("/coaches/:id/payments", h.GetCoachPayments)
}

// logServerError registra el error completo server-side y devuelve un mensaje
// genérico al cliente para no filtrar detalles internos de la base de datos.
func logServerError(msg string, err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[admin CRM] %s: %v\n", msg, err)
	}
}

// ListCoaches maneja GET /admin/coaches.
func (h *CRMHandler) ListCoaches(c *fiber.Ctx) error {
	coaches, err := h.svc.ListCoaches(c.Context())
	if err != nil {
		logServerError("list coaches", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron listar los coaches")
	}
	return appresponse.Success(c, coaches)
}

// GetRevenueStats maneja GET /admin/revenue.
func (h *CRMHandler) GetRevenueStats(c *fiber.Ctx) error {
	stats, err := h.svc.GetRevenueStats(c.Context())
	if err != nil {
		logServerError("get revenue stats", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron obtener las estadísticas de ingresos")
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
		logServerError("get coach payments", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron obtener los pagos del coach")
	}
	return appresponse.Success(c, payments)
}

// GetExpiringCoaches maneja GET /admin/coaches/expiring.
func (h *CRMHandler) GetExpiringCoaches(c *fiber.Ctx) error {
	coaches, err := h.svc.GetExpiringCoaches(c.Context())
	if err != nil {
		logServerError("get expiring coaches", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron obtener los coaches por vencer")
	}
	return appresponse.Success(c, coaches)
}

// GetExpiredCoaches maneja GET /admin/coaches/expired.
func (h *CRMHandler) GetExpiredCoaches(c *fiber.Ctx) error {
	coaches, err := h.svc.GetExpiredCoaches(c.Context())
	if err != nil {
		logServerError("get expired coaches", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "no se pudieron obtener los coaches vencidos")
	}
	return appresponse.Success(c, coaches)
}
