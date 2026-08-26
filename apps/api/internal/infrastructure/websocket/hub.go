// Package websocket provides realtime WebSocket connectivity for the MR Training API.
// It implements a hub-based pub/sub system for pushing events to connected clients.
package websocket

import (
	"encoding/json"
	"sync"

	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// Message is the envelope sent over WebSocket connections.
type Message struct {
	Type    string      `json:"type"`    // Event type, e.g. "training.updated"
	Payload interface{} `json:"payload"` // Event-specific data
	UserIDs []string    `json:"-"`       // Target user IDs; empty = broadcast to all
}

// Hub manages a set of active WebSocket clients and broadcasts messages to them.
// It runs as a single goroutine processing register/unregister/broadcast operations
// to avoid concurrent map access.
type Hub struct {
	// clients maps userID to the most recent Client connection for that user.
	clients    map[string]*Client
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
	done       chan struct{}
}

// NewHub creates a new Hub ready to be started with Run().
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		broadcast:  make(chan *Message, 256),
		done:       make(chan struct{}),
	}
}

// Run starts the hub's main event loop. Call this as a goroutine.
// It processes client registrations, unregistrations, and message broadcasts.
func (h *Hub) Run() {
	log := logger.L()
	log.Info("websocket hub started")
	defer close(h.done)

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// If a previous connection exists for this user, close it.
			if old, ok := h.clients[client.UserID]; ok {
				log.Info("replacing existing connection",
					zap.String("user_id", client.UserID))
				close(old.Send)
			}
			h.clients[client.UserID] = client
			count := len(h.clients)
			h.mu.Unlock()

			log.Info("client registered",
				zap.String("user_id", client.UserID),
				zap.Int("total_clients", count))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				// Only remove if it's the same connection instance.
				if h.clients[client.UserID] == client {
					delete(h.clients, client.UserID)
					close(client.Send)
					log.Info("client unregistered",
						zap.String("user_id", client.UserID),
						zap.Int("total_clients", len(h.clients)))
				}
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			data, err := json.Marshal(msg)
			if err != nil {
				log.Error("failed to marshal websocket message", zap.Error(err))
				continue
			}

			if len(msg.UserIDs) > 0 {
				// Targeted delivery to specific users.
				h.mu.RLock()
				for _, uid := range msg.UserIDs {
					if client, ok := h.clients[uid]; ok {
						select {
						case client.Send <- data:
						default:
							log.Warn("dropped message, client buffer full",
								zap.String("user_id", uid))
						}
					}
				}
				h.mu.RUnlock()
			} else {
				// Broadcast to all connected clients.
				h.mu.RLock()
				for _, client := range h.clients {
					select {
					case client.Send <- data:
					default:
						log.Warn("dropped broadcast message, client buffer full",
							zap.String("user_id", client.UserID))
					}
				}
				h.mu.RUnlock()
			}

		case <-h.done:
			return
		}
	}
}

// Register enqueues a client for registration in the hub.
func (h *Hub) Register(client *Client) {
	select {
	case h.register <- client:
	case <-h.done:
	}
}

// Unregister enqueues a client for removal from the hub.
func (h *Hub) Unregister(client *Client) {
	select {
	case h.unregister <- client:
	case <-h.done:
	}
}

// SendToUser sends a message to a specific connected user.
// If the user is not connected, the message is silently dropped.
func (h *Hub) SendToUser(userID string, msg Message) {
	msg.UserIDs = []string{userID}
	select {
	case h.broadcast <- &msg:
	case <-h.done:
	}
}

// Broadcast sends a message to all connected clients.
func (h *Hub) Broadcast(msg Message) {
	select {
	case h.broadcast <- &msg:
	case <-h.done:
	}
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
