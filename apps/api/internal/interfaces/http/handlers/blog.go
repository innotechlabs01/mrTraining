package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	blogapp "github.com/innotechlabs01/mr-training-api/internal/application/blog"
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
		responses[i] = dto.ArticleResponse{
			ID:          a.ID,
			Title:       a.Title,
			Slug:        a.Slug,
			Excerpt:     a.Excerpt,
			Content:     a.Content,
			AuthorID:    a.AuthorID,
			PublishedAt: a.PublishedAt,
			Tags:        a.Tags,
			CreatedAt:   a.CreatedAt,
			UpdatedAt:   a.UpdatedAt,
		}
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

	return appresponse.Success(c, dto.ArticleResponse{
		ID:          article.ID,
		Title:       article.Title,
		Slug:        article.Slug,
		Excerpt:     article.Excerpt,
		Content:     article.Content,
		AuthorID:    article.AuthorID,
		PublishedAt: article.PublishedAt,
		Tags:        article.Tags,
		CreatedAt:   article.CreatedAt,
		UpdatedAt:   article.UpdatedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *BlogHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}