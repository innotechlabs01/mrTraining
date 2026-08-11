package middleware

import (
	"context"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

type contextKey string

const (
	RequestIDHeader = "X-Request-ID"
	RequestIDKey    contextKey = "request_id"
)

func RequestIDMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get(RequestIDHeader)
			if requestID == "" {
				requestID = uuid.New().String()
			}

			ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
			ctx = zerolog.Ctx(ctx).With().Str("request_id", requestID).Logger().WithContext(ctx)

			w.Header().Set(RequestIDHeader, requestID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func FiberRequestIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set(RequestIDHeader, requestID)
		c.Locals(RequestIDKey, requestID)

		return c.Next()
	}
}

func GetRequestID(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(RequestIDKey).(string)
	return id, ok
}

func GetFiberRequestID(c *fiber.Ctx) string {
	if id := c.Locals(RequestIDKey); id != nil {
		return id.(string)
	}
	return ""
}
