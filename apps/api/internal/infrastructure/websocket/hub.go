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
	// topics maps a topic name (e.g. "challenge:<id>") to its subscribed clients.
	topics     map[string]map[*Client]bool
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
	subscribe  chan subscription
	done       chan struct{}
}

// subscription is a request to attach/detach a client to/from a topic.
type subscription struct {
	topic  string
	client *Client
	add    bool
}

// NewHub creates a new Hub ready to be started with Run().
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		topics:     make(map[string]map[*Client]bool),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		broadcast:  make(chan *Message, 256),
		subscribe:  make(chan subscription, 64),
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
			// Remove the client from every topic it subscribed to.
			for topic, members := range h.topics {
				if members[client] {
					delete(members, client)
					if len(members) == 0 {
						delete(h.topics, topic)
					}
				}
			}
			h.mu.Unlock()

		case sub := <-h.subscribe:
			h.mu.Lock()
			if sub.add {
				if h.topics[sub.topic] == nil {
					h.topics[sub.topic] = make(map[*Client]bool)
				}
				h.topics[sub.topic][sub.client] = true
			} else if members, ok := h.topics[sub.topic]; ok {
				delete(members, sub.client)
				if len(members) == 0 {
					delete(h.topics, sub.topic)
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

// Subscribe attaches a client to a topic (e.g. "challenge:<id>").
func (h *Hub) Subscribe(client *Client, topic string) {
	select {
	case h.subscribe <- subscription{topic: topic, client: client, add: true}:
	case <-h.done:
	}
}

// Unsubscribe detaches a client from a topic.
func (h *Hub) Unsubscribe(client *Client, topic string) {
	select {
	case h.subscribe <- subscription{topic: topic, client: client, add: false}:
	case <-h.done:
	}
}

// BroadcastToTopic sends a message to every client subscribed to a topic.
func (h *Hub) BroadcastToTopic(topic string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		logger.L().Error("failed to marshal topic message", zap.Error(err))
		return
	}

	h.mu.RLock()
	members := h.topics[topic]
	clients := make([]*Client, 0, len(members))
	for c := range members {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, client := range clients {
		select {
		case client.Send <- data:
		default:
			logger.L().Warn("dropped topic message, client buffer full",
				zap.String("topic", topic),
				zap.String("user_id", client.UserID))
		}
	}
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
