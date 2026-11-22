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

// TestHubMultipleConnectionsSameUserKeepBothOpen verifies that registering a
// second connection for the same userID keeps both connections open, delivers
// user/topic/global broadcasts to both, and closing one preserves the other.
func TestHubMultipleConnectionsSameUserKeepBothOpen(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Shutdown()
	time.Sleep(10 * time.Millisecond)

	client1 := &websocket.Client{
		UserID: "user-1",
		Send:   make(chan []byte, 256),
	}
	client1.Hub = hub

	client2 := &websocket.Client{
		UserID: "user-1",
		Send:   make(chan []byte, 256),
	}
	client2.Hub = hub

	hub.Register(client1)
	hub.Register(client2)

	if hub.ClientCount() != 2 {
		t.Fatalf("expected 2 clients for same user, got %d", hub.ClientCount())
	}

	// Both connections stay open: subscribe both to a topic and verify delivery.
	hub.Subscribe(client1, "challenge:ch-1")
	hub.Subscribe(client2, "challenge:ch-1")

	hub.BroadcastToTopic("challenge:ch-1", websocket.Message{
		Type:    "challenge.leaderboard.updated",
		Payload: map[string]int{"rank": 1},
	})

	for idx, cl := range []*websocket.Client{client1, client2} {
		select {
		case data, ok := <-cl.Send:
			if !ok {
				t.Fatalf("client%d.Send closed unexpectedly", idx+1)
			}
			var got websocket.Message
			if err := json.Unmarshal(data, &got); err != nil {
				t.Fatalf("client%d: unmarshal failed: %v", idx+1, err)
			}
			if got.Type != "challenge.leaderboard.updated" {
				t.Fatalf("client%d: expected challenge.leaderboard.updated, got %q", idx+1, got.Type)
			}
		case <-time.After(time.Second):
			t.Fatalf("client%d: timeout waiting for topic broadcast", idx+1)
		}
	}

	// SendToUser should also deliver to both open sockets for user-1.
	hub.SendToUser("user-1", websocket.Message{Type: "store.updated", Payload: "ok"})
	for idx, cl := range []*websocket.Client{client1, client2} {
		select {
		case data, ok := <-cl.Send:
			if !ok {
				t.Fatalf("client%d.Send closed unexpectedly", idx+1)
			}
			var got websocket.Message
			if err := json.Unmarshal(data, &got); err != nil {
				t.Fatalf("client%d: unmarshal failed: %v", idx+1, err)
			}
			if got.Type != "store.updated" {
				t.Fatalf("client%d: expected store.updated, got %q", idx+1, got.Type)
			}
		case <-time.After(time.Second):
			t.Fatalf("client%d: timeout waiting for SendToUser", idx+1)
		}
	}

	// Unregistering client1 closes only client1; client2 stays open and receives topic broadcasts.
	hub.Unregister(client1)
	if hub.ClientCount() != 1 {
		t.Fatalf("expected 1 client remaining after unregistering client1, got %d", hub.ClientCount())
	}
	select {
	case _, ok := <-client1.Send:
		if ok {
			t.Fatal("expected client1.Send to be closed after unregister")
		}
	default:
		t.Fatal("expected client1.Send to be closed after unregister")
	}

	hub.BroadcastToTopic("challenge:ch-1", websocket.Message{
		Type:    "challenge.leaderboard.updated",
		Payload: map[string]int{"rank": 2},
	})
	select {
	case data, ok := <-client2.Send:
		if !ok {
			t.Fatal("expected client2.Send to remain open")
		}
		var got websocket.Message
		if err := json.Unmarshal(data, &got); err != nil {
			t.Fatalf("client2: unmarshal failed: %v", err)
		}
		if got.Type != "challenge.leaderboard.updated" {
			t.Fatalf("client2: expected challenge.leaderboard.updated, got %q", got.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("client2: timeout waiting for second topic broadcast")
	}
}

// TestHubConcurrentSameUserAndTopicBroadcast verifies under -race that two
// concurrent connections for the same userID both stay open and receive topic
// broadcasts while concurrent register/unsubscribe/shutdown happen safely.
func TestHubConcurrentSameUserAndTopicBroadcast(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	defer hub.Shutdown()

	c1 := &websocket.Client{UserID: "same-user", Send: make(chan []byte, 256), Hub: hub}
	c2 := &websocket.Client{UserID: "same-user", Send: make(chan []byte, 256), Hub: hub}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		hub.Register(c1)
		hub.Subscribe(c1, "challenge:race")
	}()
	go func() {
		defer wg.Done()
		hub.Register(c2)
		hub.Subscribe(c2, "challenge:race")
	}()
	wg.Wait()

	if hub.ClientCount() != 2 {
		t.Fatalf("expected 2 concurrent connections, got %d", hub.ClientCount())
	}

	const msgCount = 10
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < msgCount; i++ {
			hub.BroadcastToTopic("challenge:race", websocket.Message{
				Type:    "challenge.leaderboard.updated",
				Payload: map[string]int{"seq": i},
			})
		}
	}()
	wg.Wait()

	for idx, cl := range []*websocket.Client{c1, c2} {
		for i := 0; i < msgCount; i++ {
			select {
			case _, ok := <-cl.Send:
				if !ok {
					t.Fatalf("client%d closed prematurely at message %d", idx+1, i)
				}
			case <-time.After(time.Second):
				t.Fatalf("client%d timed out waiting for topic broadcast %d", idx+1, i)
			}
		}
	}

	// Shutdown must close both remaining connections cleanly without double-close panic.
	hub.Shutdown()
	hub.Shutdown()
	for idx, cl := range []*websocket.Client{c1, c2} {
		select {
		case _, ok := <-cl.Send:
			if ok {
				t.Fatalf("expected client%d.Send closed on shutdown", idx+1)
			}
		case <-time.After(time.Second):
			t.Fatalf("client%d.Send not closed on shutdown", idx+1)
		}
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
