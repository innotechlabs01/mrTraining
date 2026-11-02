package middleware

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ServerTiming returns middleware that measures total request handling time and
// reports it in the standard Server-Timing header:
//
//	Server-Timing: app;dur=12.34
//
// Browsers surface the value in the DevTools Network panel (and it can be read
// by the client via the Timing-Allow-Origin header), making backend latency
// measurable end-to-end without extra instrumentation.
func ServerTiming() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		if err := c.Next(); err != nil {
			return err
		}
		ms := float64(time.Since(start).Microseconds()) / 1000
		c.Set("Server-Timing", "app;dur="+strconv.FormatFloat(ms, 'f', 2, 64))
		return nil
	}
}
