package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	blogapp "github.com/innotechlabs01/mr-training-api/internal/application/blog"
	"github.com/innotechlabs01/mr-training-api/internal/domain/blog"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// BlogHandler handles HTTP requests for the blog domain.
type BlogHandler struct {
	service *blogapp.Service
}

// NewBlogHandler creates a new BlogHandler with the given application service.
func NewBlogHandler(service *blogapp.Service) *BlogHandler {
	return &BlogHandler{service: service}
}

// ListArticles handles GET /blog.
func (h *BlogHandler) ListArticles(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	articles, total, err := h.service.ListArticles(c.Context(), page, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.ArticleResponse, len(articles))
	for i, a := range articles {
		responses[i] = toArticleResponse(a)
	}

	return appresponse.Success(c, dto.ListResponse[dto.ArticleResponse]{
		Data:  responses,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetArticle handles GET /blog/:id.
func (h *BlogHandler) GetArticle(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "article ID is required")
	}

	article, err := h.service.GetArticle(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toArticleResponse(article))
}

// ListCoachArticles handles GET /coach/blog (drafts included).
func (h *BlogHandler) ListCoachArticles(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)
	articles, err := h.service.ListByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.ArticleResponse, len(articles))
	for i, a := range articles {
		responses[i] = toArticleResponse(a)
	}
	return appresponse.Success(c, responses)
}

// CreateArticle handles POST /blog.
func (h *BlogHandler) CreateArticle(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)

	var req dto.ArticleRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	article := &blog.Article{
		Title:           req.Title,
		Slug:            req.Slug,
		Excerpt:         req.Excerpt,
		Content:         req.Content,
		Category:        req.Category,
		ImageURL:        req.ImageURL,
		IsPublished:     req.IsPublished,
		PublishedAt:     req.PublishedAt,
		Tags:            req.Tags,
		ReadTimeMinutes: req.ReadTimeMinutes,
		AuthorID:        coachID,
	}

	if err := h.service.CreateArticle(c.Context(), article); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toArticleResponse(article))
}

// UpdateArticle handles PUT /blog/:id.
func (h *BlogHandler) UpdateArticle(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "article ID is required")
	}

	var req dto.ArticleRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	article := &blog.Article{
		ID:              id,
		Title:           req.Title,
		Slug:            req.Slug,
		Excerpt:         req.Excerpt,
		Content:         req.Content,
		Category:        req.Category,
		ImageURL:        req.ImageURL,
		IsPublished:     req.IsPublished,
		PublishedAt:     req.PublishedAt,
		Tags:            req.Tags,
		ReadTimeMinutes: req.ReadTimeMinutes,
		AuthorID:        coachID,
	}

	if err := h.service.UpdateArticle(c.Context(), article); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toArticleResponse(article))
}

// DeleteArticle handles DELETE /blog/:id.
func (h *BlogHandler) DeleteArticle(c *fiber.Ctx) error {
	coachID := c.Locals("userID").(string)
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "article ID is required")
	}

	if err := h.service.DeleteArticle(c.Context(), id, coachID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"ok": true})
}

func toArticleResponse(a *blog.Article) dto.ArticleResponse {
	return dto.ArticleResponse{
		ID:              a.ID,
		Title:           a.Title,
		Slug:            a.Slug,
		Excerpt:         a.Excerpt,
		Content:         a.Content,
		AuthorID:        a.AuthorID,
		Category:        a.Category,
		ImageURL:        a.ImageURL,
		IsPublished:     a.IsPublished,
		PublishedAt:     a.PublishedAt,
		Tags:            a.Tags,
		ReadTimeMinutes: a.ReadTimeMinutes,
		Views:           a.Views,
		CreatedAt:       a.CreatedAt,
		UpdatedAt:       a.UpdatedAt,
	}
}

// handleError maps application errors to appropriate HTTP responses.
func (h *BlogHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}