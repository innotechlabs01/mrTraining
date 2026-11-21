package middleware_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type stubRedisEval struct {
	count int64
	err   error
}

func (s *stubRedisEval) Eval(_ context.Context, _ string, _ []string, _ ...interface{}) *redis.Cmd {
	cmd := redis.NewCmd(context.Background())
	if s.err != nil {
		cmd.SetErr(s.err)
		return cmd
	}
	s.count++
	cmd.SetVal([]interface{}{s.count, int64(5000)})
	return cmd
}

func TestRateLimit_RedisDistributedAndFailOpenFallback(t *testing.T) {
	eval := &stubRedisEval{}
	app := fiber.New()
	app.Get("/limited", middleware.RateLimitWithEvaluator(2, 60, eval), func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	})

	for i := 0; i < 2; i++ {
		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/limited", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
	}
	resp3, err := app.Test(httptest.NewRequest(http.MethodGet, "/limited", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusTooManyRequests, resp3.StatusCode)

	// Redis failure must fail-open to local in-memory limiter (not 500)
	failingEval := &stubRedisEval{err: errors.New("redis connection refused")}
	appFallback := fiber.New()
	appFallback.Get("/fallback", middleware.RateLimitWithEvaluator(2, 60, failingEval), func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	})
	respFB, err := appFallback.Test(httptest.NewRequest(http.MethodGet, "/fallback", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, respFB.StatusCode)
}
