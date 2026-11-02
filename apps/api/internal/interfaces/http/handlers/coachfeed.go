package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	coachfeedapp "github.com/innotechlabs01/mr-training-api/internal/application/coachfeed"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CoachFeedHandler handles HTTP requests for the coach feed domain.
type CoachFeedHandler struct {
	service *coachfeedapp.Service
}

// NewCoachFeedHandler creates a new CoachFeedHandler.
func NewCoachFeedHandler(service *coachfeedapp.Service) *CoachFeedHandler {
	return &CoachFeedHandler{service: service}
}

// ListPosts handles GET /coach/feed.
func (h *CoachFeedHandler) ListPosts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	posts, err := h.service.ListPosts(c.Context(), limit, offset)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to list posts")
	}

	return appresponse.Success(c, fiber.Map{
		"posts": posts,
	})
}

// GetPost handles GET /coach/feed/:postId.
func (h *CoachFeedHandler) GetPost(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	postID := c.Params("postId")
	if postID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "post ID is required")
	}

	post, err := h.service.GetPost(c.Context(), postID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, "post not found")
	}

	return appresponse.Success(c, post)
}

// CreatePost handles POST /coach/feed.
func (h *CoachFeedHandler) CreatePost(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var body struct {
		Content   string `json:"content"`
		MediaType string `json:"media_type"`
		MediaURL  string `json:"media_url"`
	}
	if err := c.BodyParser(&body); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	post, err := h.service.CreatePost(c.Context(), userID, userID, body.Content, body.MediaType, body.MediaURL)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, post)
}

// DeletePost handles DELETE /coach/feed/:postId.
func (h *CoachFeedHandler) DeletePost(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	postID := c.Params("postId")
	if postID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "post ID is required")
	}

	if err := h.service.DeletePost(c.Context(), postID, userID); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to delete post")
	}

	return appresponse.Success(c, fiber.Map{"deleted": true})
}

// AddReaction handles POST /coach/feed/:postId/react.
func (h *CoachFeedHandler) AddReaction(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	postID := c.Params("postId")
	if postID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "post ID is required")
	}

	var body struct {
		Type string `json:"type"`
	}
	if err := c.BodyParser(&body); err != nil {
		body.Type = "like"
	}
	if body.Type == "" {
		body.Type = "like"
	}

	if err := h.service.AddReaction(c.Context(), postID, userID, body.Type); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to add reaction")
	}

	return appresponse.Success(c, fiber.Map{"reacted": true})
}

// RemoveReaction handles DELETE /coach/feed/:postId/react.
func (h *CoachFeedHandler) RemoveReaction(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	postID := c.Params("postId")
	if postID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "post ID is required")
	}

	if err := h.service.RemoveReaction(c.Context(), postID, userID); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to remove reaction")
	}

	return appresponse.Success(c, fiber.Map{"removed": true})
}

// AddComment handles POST /coach/feed/:postId/comment.
func (h *CoachFeedHandler) AddComment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	postID := c.Params("postId")
	if postID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "post ID is required")
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&body); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	comment, err := h.service.AddComment(c.Context(), postID, userID, userID, body.Content)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}

	return appresponse.Success(c, comment)
}

// ListComments handles GET /coach/feed/:postId/comments.
func (h *CoachFeedHandler) ListComments(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	postID := c.Params("postId")
	if postID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "post ID is required")
	}

	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	comments, err := h.service.ListComments(c.Context(), postID, limit, offset)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to list comments")
	}

	return appresponse.Success(c, fiber.Map{
		"comments": comments,
	})
}
