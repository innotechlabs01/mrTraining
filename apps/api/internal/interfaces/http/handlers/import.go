package handlers

import (
	"github.com/gofiber/fiber/v2"

	importapp "github.com/innotechlabs01/mr-training-api/internal/application/import"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// ImportHandler handles HTTP requests for the import domain.
type ImportHandler struct {
	service *importapp.Service
}

// NewImportHandler creates a new ImportHandler with the given application service.
func NewImportHandler(service *importapp.Service) *ImportHandler {
	return &ImportHandler{service: service}
}

// ImportData handles POST /import.
func (h *ImportHandler) ImportData(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.ImportDataRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Source == "" || req.CSVData == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "source and csv_data are required")
	}

	job, err := h.service.ImportData(c.Context(), userID, req.Source, req.CSVData)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.ImportJobResponse{
		ID:                job.ID,
		Source:            job.Source,
		Status:            job.Status,
		WorkoutsImported:  job.WorkoutsImported,
		ExercisesImported: job.ExercisesImported,
		ErrorMessage:      job.ErrorMessage,
		CreatedAt:         job.CreatedAt,
		CompletedAt:       job.CompletedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *ImportHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}