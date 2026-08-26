package websocket

import (
	"time"

	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer (64KB).
	maxMessageSize = 64 * 1024

	// SendBufferSize is the capacity of a client's send channel.
	SendBufferSize = 256
)

// Client represents a single WebSocket connection tied to an authenticated user.
type Client struct {
	Hub    *Hub
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

// NewClient creates a new Client with the given parameters.
func NewClient(hub *Hub, userID string, conn *websocket.Conn) *Client {
	return &Client{
		Hub:    hub,
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, SendBufferSize),
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub.
// It blocks until the connection is closed. It is responsible for:
//   - Reading incoming messages (currently ignored; server is receive-only)
//   - Handling pong responses to keep the connection alive
//   - Detecting client disconnects
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				logger.L().Warn("websocket unexpected close",
					zap.String("user_id", c.UserID),
					zap.Error(err))
			}
			break
		}
		// Server is receive-only; ignore incoming messages.
	}
}

// WritePump pumps messages from the hub to the WebSocket connection.
// It blocks until the connection is closed. It is responsible for:
//   - Sending queued messages to the client
//   - Sending periodic pings to detect dead connections
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Drain any queued messages into the current write.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte("\n"))
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
