// Package handlers provides HTTP endpoint handlers for the user domain.
package handlers

import (
	"github.com/gofiber/fiber/v2"
	fiberws "github.com/gofiber/websocket/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// HandleWebSocket returns a Fiber handler that upgrades the connection to
// WebSocket, reads the authenticated user ID set by WSAuth middleware,
// and starts the client read/write pumps.
//
// Usage:
//
//	app.Get("/ws", middleware.WSAuth(clerkKey), handlers.HandleWebSocket(hub))
func HandleWebSocket(hub *websocket.Hub) fiber.Handler {
	return fiberws.New(func(conn *fiberws.Conn) {
		// The WSAuth middleware verified the JWT and stored the user ID.
		// Use string(key) because middleware stores with string(UserIDKey).
		userID, ok := conn.Locals(string(middleware.UserIDKey)).(string)
		if !ok || userID == "" {
			conn.Close()
			return
		}

		log := logger.L()
		log.Info("websocket connection established", zap.String("user_id", userID))

		client := websocket.NewClient(hub, userID, conn)
		hub.Register(client)

		// Start write pump in a goroutine; readPump blocks until disconnect.
		go client.WritePump()
		client.ReadPump()
	})
}
