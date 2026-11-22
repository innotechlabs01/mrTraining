// Package websocket provides realtime WebSocket connectivity for the MR Training API.
// It implements a hub-based pub/sub system for pushing events to connected clients.
package websocket

import (
	"context"
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

// Hub manages active WebSocket clients and broadcasts messages to them.
// Multiple concurrent connections per userID are supported without evicting
// existing sockets (e.g. store realtime + challenge leaderboard open together).
type Hub struct {
	clients   map[string]map[*Client]struct{}
	topics    map[string]map[*Client]struct{}
	mu        sync.RWMutex
	stopped   bool
	broadcast chan *Message
	done      chan struct{}
	stopOnce  sync.Once
	extMu     sync.RWMutex
	external  func(topic string, userIDs []string, msg Message)
}

// NewHub creates a new Hub ready to be started with Run().
func NewHub() *Hub {
	return &Hub{
		clients:   make(map[string]map[*Client]struct{}),
		topics:    make(map[string]map[*Client]struct{}),
		broadcast: make(chan *Message, 256),
		done:      make(chan struct{}),
	}
}

// Run starts the hub's main event loop. Call this as a goroutine.
func (h *Hub) Run() {
	h.RunWithContext(context.Background())
}

// RunWithContext runs the hub's main event loop until ctx is canceled or Stop/Shutdown is called.
func (h *Hub) RunWithContext(ctx context.Context) {
	if ctx == nil {
		ctx = context.Background()
	}
	log := logger.L()
	log.Info("websocket hub started")
	defer h.Shutdown()

	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-h.broadcast:
			h.deliverBroadcast(msg)
		case <-h.done:
			return
		}
	}
}

func (h *Hub) deliverBroadcast(msg *Message) {
	if msg == nil {
		return
	}
	log := logger.L()
	data, err := json.Marshal(msg)
	if err != nil {
		log.Error("failed to marshal websocket message", zap.Error(err))
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	if h.stopped {
		return
	}

	if len(msg.UserIDs) > 0 {
		for _, uid := range msg.UserIDs {
			for client := range h.clients[uid] {
				sendNonBlocking(client, data, "")
			}
		}
		return
	}

	for _, conns := range h.clients {
		for client := range conns {
			sendNonBlocking(client, data, "")
		}
	}
}

func sendNonBlocking(client *Client, data []byte, topic string) {
	select {
	case client.Send <- data:
	default:
		if topic != "" {
			logger.L().Warn("dropped topic message, client buffer full",
				zap.String("topic", topic),
				zap.String("user_id", client.UserID))
			return
		}
		logger.L().Warn("dropped message, client buffer full",
			zap.String("user_id", client.UserID))
	}
}

// Stop stops the hub event loop and closes all connected client channels.
// Safe to call multiple times.
func (h *Hub) Stop() {
	h.Shutdown()
}

// Shutdown stops the hub cleanly, closing all active client send channels
// and clearing registered clients and topic subscriptions. Safe to call multiple times.
func (h *Hub) Shutdown() {
	h.stopOnce.Do(func() {
		close(h.done)
		h.mu.Lock()
		h.stopped = true
		for uid, conns := range h.clients {
			for client := range conns {
				client.CloseSend()
			}
			delete(h.clients, uid)
		}
		for topic, members := range h.topics {
			for client := range members {
				client.CloseSend()
			}
			delete(h.topics, topic)
		}
		h.mu.Unlock()
	})
}

// Register adds a client connection for its UserID without closing existing
// connections belonging to the same user.
func (h *Hub) Register(client *Client) {
	if client == nil || client.UserID == "" {
		return
	}

	h.mu.Lock()
	if h.stopped || client.IsClosed() {
		h.mu.Unlock()
		client.CloseSend()
		return
	}
	conns := h.clients[client.UserID]
	if conns == nil {
		conns = make(map[*Client]struct{})
		h.clients[client.UserID] = conns
	}
	conns[client] = struct{}{}
	count := h.totalClientsLocked()
	h.mu.Unlock()

	logger.L().Info("client registered",
		zap.String("user_id", client.UserID),
		zap.Int("total_clients", count))
}

// Unregister removes a client connection from its UserID set and all topics,
// then closes its Send channel.
func (h *Hub) Unregister(client *Client) {
	if client == nil {
		return
	}

	h.mu.Lock()
	removed := false
	if conns, ok := h.clients[client.UserID]; ok {
		if _, exists := conns[client]; exists {
			delete(conns, client)
			removed = true
			if len(conns) == 0 {
				delete(h.clients, client.UserID)
			}
		}
	}
	for topic, members := range h.topics {
		if _, exists := members[client]; exists {
			delete(members, client)
			if len(members) == 0 {
				delete(h.topics, topic)
			}
		}
	}
	client.CloseSend()
	count := h.totalClientsLocked()
	h.mu.Unlock()

	if removed {
		logger.L().Info("client unregistered",
			zap.String("user_id", client.UserID),
			zap.Int("total_clients", count))
	}
}

func (h *Hub) totalClientsLocked() int {
	total := 0
	for _, conns := range h.clients {
		total += len(conns)
	}
	return total
}

// SetExternalBroadcaster registers a callback used to replicate WebSocket
// messages across cluster replicas.
func (h *Hub) SetExternalBroadcaster(fn func(topic string, userIDs []string, msg Message)) {
	h.extMu.Lock()
	h.external = fn
	h.extMu.Unlock()
}

func (h *Hub) emitExternal(topic string, userIDs []string, msg Message) {
	h.extMu.RLock()
	fn := h.external
	h.extMu.RUnlock()
	if fn != nil {
		fn(topic, userIDs, msg)
	}
}

// SendToUser sends a message to all active connections of a specific user and
// forwards it to any registered cluster broadcaster.
func (h *Hub) SendToUser(userID string, msg Message) {
	if userID == "" {
		return
	}
	msg.UserIDs = []string{userID}
	h.SendToUserLocal(userID, msg)
	h.emitExternal("", []string{userID}, msg)
}

// SendToUserLocal delivers msg only to local WebSocket clients for userID.
func (h *Hub) SendToUserLocal(userID string, msg Message) {
	if userID == "" {
		return
	}
	select {
	case <-h.done:
		return
	default:
	}
	msg.UserIDs = []string{userID}
	select {
	case h.broadcast <- &msg:
	case <-h.done:
	}
}

// Broadcast sends a message to all connected clients and cluster replicas.
func (h *Hub) Broadcast(msg Message) {
	h.BroadcastLocal(msg)
	h.emitExternal("", nil, msg)
}

// BroadcastLocal delivers msg only to locally connected WebSocket clients.
func (h *Hub) BroadcastLocal(msg Message) {
	select {
	case <-h.done:
		return
	default:
	}
	select {
	case h.broadcast <- &msg:
	case <-h.done:
	}
}

// Subscribe attaches a client to a topic (e.g. "challenge:<id>").
func (h *Hub) Subscribe(client *Client, topic string) {
	if client == nil || topic == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.stopped || client.IsClosed() {
		return
	}
	members := h.topics[topic]
	if members == nil {
		members = make(map[*Client]struct{})
		h.topics[topic] = members
	}
	members[client] = struct{}{}
}

// Unsubscribe detaches a client from a topic.
func (h *Hub) Unsubscribe(client *Client, topic string) {
	if client == nil || topic == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if members, ok := h.topics[topic]; ok {
		delete(members, client)
		if len(members) == 0 {
			delete(h.topics, topic)
		}
	}
}

// BroadcastToTopic sends a message to every client subscribed to topic and
// replicates it across cluster nodes.
func (h *Hub) BroadcastToTopic(topic string, msg Message) {
	h.BroadcastToTopicLocal(topic, msg)
	h.emitExternal(topic, nil, msg)
}

// BroadcastToTopicLocal delivers msg only to local clients subscribed to topic.
func (h *Hub) BroadcastToTopicLocal(topic string, msg Message) {
	if topic == "" {
		return
	}
	data, err := json.Marshal(msg)
	if err != nil {
		logger.L().Error("failed to marshal topic message", zap.Error(err))
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	if h.stopped {
		return
	}
	for client := range h.topics[topic] {
		sendNonBlocking(client, data, topic)
	}
}

// ClientCount returns the number of active connected WebSocket clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.totalClientsLocked()
}
