package websocket_test

import (
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
)

// TestHubRegisterUnregister verifies that clients are properly added and removed.
func TestHubRegisterUnregister(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()

	// Allow hub to start
	time.Sleep(10 * time.Millisecond)

	if hub.ClientCount() != 0 {
		t.Fatalf("expected 0 clients, got %d", hub.ClientCount())
	}

	// Create mock clients with buffered channels (no real connection needed)
	client1 := &websocket.Client{
		UserID: "user-1",
		Send:   make(chan []byte, 256),
	}
	client1.Hub = hub

	client2 := &websocket.Client{
		UserID: "user-2",
		Send:   make(chan []byte, 256),
	}
	client2.Hub = hub

	// Register clients
	hub.Register(client1)
	time.Sleep(10 * time.Millisecond)
	if hub.ClientCount() != 1 {
		t.Fatalf("expected 1 client after register, got %d", hub.ClientCount())
	}

	hub.Register(client2)
	time.Sleep(10 * time.Millisecond)
	if hub.ClientCount() != 2 {
		t.Fatalf("expected 2 clients after register, got %d", hub.ClientCount())
	}

	// Unregister client1
	hub.Unregister(client1)
	time.Sleep(10 * time.Millisecond)
	if hub.ClientCount() != 1 {
		t.Fatalf("expected 1 client after unregister, got %d", hub.ClientCount())
	}

	// Unregister client2
	hub.Unregister(client2)
	time.Sleep(10 * time.Millisecond)
	if hub.ClientCount() != 0 {
		t.Fatalf("expected 0 clients after unregister all, got %d", hub.ClientCount())
	}
}

// TestHubRegisterReplacesOldConnection verifies that registering the same
// userID replaces the previous connection.
func TestHubRegisterReplacesOldConnection(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	time.Sleep(10 * time.Millisecond)

	// Register first connection
	client1 := &websocket.Client{
		UserID: "user-1",
		Send:   make(chan []byte, 256),
	}
	client1.Hub = hub
	hub.Register(client1)
	time.Sleep(10 * time.Millisecond)

	if hub.ClientCount() != 1 {
		t.Fatalf("expected 1 client, got %d", hub.ClientCount())
	}

	// Register second connection with same userID — should replace first
	client2 := &websocket.Client{
		UserID: "user-1",
		Send:   make(chan []byte, 256),
	}
	client2.Hub = hub
	hub.Register(client2)
	time.Sleep(10 * time.Millisecond)

	// Should still be 1 client (replaced, not added)
	if hub.ClientCount() != 1 {
		t.Fatalf("expected 1 client after replace, got %d", hub.ClientCount())
	}

	// Old channel should be closed
	select {
	case _, ok := <-client1.Send:
		if ok {
			t.Fatal("expected client1.Send to be closed")
		}
	default:
		t.Fatal("expected client1.Send to be closed")
	}
}

// TestHubSendToUser verifies targeted delivery to a specific user.
func TestHubSendToUser(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	time.Sleep(10 * time.Millisecond)

	// Register two clients
	client1 := &websocket.Client{
		UserID: "user-1",
		Send:   make(chan []byte, 256),
	}
	client1.Hub = hub

	client2 := &websocket.Client{
		UserID: "user-2",
		Send:   make(chan []byte, 256),
	}
	client2.Hub = hub

	hub.Register(client1)
	hub.Register(client2)
	time.Sleep(10 * time.Millisecond)

	// Send to user-1 only
	msg := websocket.Message{
		Type:    "test.event",
		Payload: map[string]string{"key": "value"},
	}
	hub.SendToUser("user-1", msg)
	time.Sleep(10 * time.Millisecond)

	// client1 should receive the message
	select {
	case data := <-client1.Send:
		var received websocket.Message
		if err := json.Unmarshal(data, &received); err != nil {
			t.Fatalf("failed to unmarshal message: %v", err)
		}
		if received.Type != "test.event" {
			t.Errorf("expected type 'test.event', got '%s'", received.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for message on client1")
	}

	// client2 should NOT receive the message
	select {
	case <-client2.Send:
		t.Fatal("client2 should not have received the message")
	case <-time.After(50 * time.Millisecond):
		// Expected: no message
	}
}

// TestHubBroadcast verifies that broadcast reaches all connected clients.
func TestHubBroadcast(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	time.Sleep(10 * time.Millisecond)

	var mu sync.Mutex
	clients := make([]*websocket.Client, 3)
	for i := 0; i < 3; i++ {
		c := &websocket.Client{
			UserID: "user-" + string(rune('A'+i)),
			Send:   make(chan []byte, 256),
		}
		c.Hub = hub
		clients[i] = c
		hub.Register(c)
	}
	time.Sleep(10 * time.Millisecond)

	// Broadcast
	msg := websocket.Message{
		Type:    "broadcast.test",
		Payload: "hello everyone",
	}
	hub.Broadcast(msg)
	time.Sleep(10 * time.Millisecond)

	// All clients should receive
	for i, c := range clients {
		mu.Lock()
		select {
		case data := <-c.Send:
			var received websocket.Message
			if err := json.Unmarshal(data, &received); err != nil {
				mu.Unlock()
				t.Fatalf("client %d: failed to unmarshal: %v", i, err)
			}
			if received.Type != "broadcast.test" {
				mu.Unlock()
				t.Errorf("client %d: expected type 'broadcast.test', got '%s'", i, received.Type)
			}
		case <-time.After(time.Second):
			mu.Unlock()
			t.Fatalf("client %d: timeout waiting for broadcast", i)
		}
		mu.Unlock()
	}
}

// TestHubBroadcastDropsWhenBufferFull verifies that messages are dropped
// (not blocking) when a client's send buffer is full.
func TestHubBroadcastDropsWhenBufferFull(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	time.Sleep(10 * time.Millisecond)

	// Client with tiny buffer
	client := &websocket.Client{
		UserID: "slow-user",
		Send:   make(chan []byte, 1), // capacity 1
	}
	client.Hub = hub
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	// Fill the buffer
	msg := websocket.Message{Type: "fill", Payload: "first"}
	hub.Broadcast(msg)
	time.Sleep(5 * time.Millisecond)

	// Second message should be dropped (buffer full), not block
	done := make(chan struct{})
	go func() {
		hub.Broadcast(websocket.Message{Type: "overflow", Payload: "second"})
		close(done)
	}()

	select {
	case <-done:
		// Broadcast returned without blocking — good
	case <-time.After(time.Second):
		t.Fatal("broadcast blocked when buffer was full (should drop)")
	}
}
