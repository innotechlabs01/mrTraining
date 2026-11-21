package handlers

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// MeetSignal represents a WebRTC P2P signaling message (SDP offer/answer or ICE candidate).
type MeetSignal struct {
	Seq       int64       `json:"seq"`
	RoomID    string      `json:"room_id"`
	Type      string      `json:"type"` // offer | answer | candidate | join | leave
	SenderID  string      `json:"sender_id"`
	Role      string      `json:"role,omitempty"` // coach | athlete
	SDP       interface{} `json:"sdp,omitempty"`
	Candidate interface{} `json:"candidate,omitempty"`
	CreatedAt string      `json:"created_at"`
}

type meetRoom struct {
	nextSeq  int64
	messages []MeetSignal
	updated  time.Time
}

// MeetSignalingHandler manages ephemeral WebRTC signaling for P2P onboarding meets.
type MeetSignalingHandler struct {
	mu    sync.Mutex
	rooms map[string]*meetRoom
	hub   *websocket.Hub
}

// NewMeetSignalingHandler creates a new signaling handler optionally backed by WS Hub.
func NewMeetSignalingHandler(hub *websocket.Hub) *MeetSignalingHandler {
	return &MeetSignalingHandler{
		rooms: make(map[string]*meetRoom),
		hub:   hub,
	}
}

func (h *MeetSignalingHandler) cleanupLocked(now time.Time) {
	cutoff := now.Add(-4 * time.Hour)
	for id, room := range h.rooms {
		if room.updated.Before(cutoff) {
			delete(h.rooms, id)
		}
	}
}

// PostSignal handles POST /meet/:roomId/signal.
func (h *MeetSignalingHandler) PostSignal(c *fiber.Ctx) error {
	roomID := strings.TrimSpace(c.Params("roomId"))
	if roomID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "roomId is required")
	}

	var req struct {
		Type      string      `json:"type"`
		SenderID  string      `json:"sender_id"`
		Role      string      `json:"role"`
		SDP       interface{} `json:"sdp"`
		Candidate interface{} `json:"candidate"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(req.Type) == "" || strings.TrimSpace(req.SenderID) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "type and sender_id are required")
	}

	now := time.Now().UTC()

	h.mu.Lock()
	h.cleanupLocked(now)
	room, ok := h.rooms[roomID]
	if !ok {
		room = &meetRoom{}
		h.rooms[roomID] = room
	}
	room.nextSeq++
	msg := MeetSignal{
		Seq:       room.nextSeq,
		RoomID:    roomID,
		Type:      req.Type,
		SenderID:  req.SenderID,
		Role:      req.Role,
		SDP:       req.SDP,
		Candidate: req.Candidate,
		CreatedAt: now.Format(time.RFC3339),
	}
	room.messages = append(room.messages, msg)
	if len(room.messages) > 200 {
		room.messages = room.messages[len(room.messages)-200:]
	}
	room.updated = now
	h.mu.Unlock()

	if h.hub != nil {
		h.hub.BroadcastToTopic("meet:"+roomID, websocket.Message{
			Type:    "meet.signal",
			Payload: msg,
		})
	}

	return appresponse.Success(c, fiber.Map{
		"seq":    msg.Seq,
		"signal": msg,
	})
}

// GetSignals handles GET /meet/:roomId/signals?since=0&exclude_sender=xxx.
func (h *MeetSignalingHandler) GetSignals(c *fiber.Ctx) error {
	roomID := strings.TrimSpace(c.Params("roomId"))
	if roomID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "roomId is required")
	}
	since, _ := strconv.ParseInt(c.Query("since", "0"), 10, 64)
	excludeSender := strings.TrimSpace(c.Query("exclude_sender", ""))

	h.mu.Lock()
	room, ok := h.rooms[roomID]
	var out []MeetSignal
	latestSeq := since
	if ok {
		for _, m := range room.messages {
			if m.Seq > latestSeq {
				latestSeq = m.Seq
			}
			if m.Seq > since && (excludeSender == "" || m.SenderID != excludeSender) {
				out = append(out, m)
			}
		}
	}
	if out == nil {
		out = []MeetSignal{}
	}
	h.mu.Unlock()

	return appresponse.Success(c, fiber.Map{
		"room_id":    roomID,
		"latest_seq": latestSeq,
		"signals":    out,
	})
}

// ClearSignals handles DELETE /meet/:roomId/signals.
func (h *MeetSignalingHandler) ClearSignals(c *fiber.Ctx) error {
	roomID := strings.TrimSpace(c.Params("roomId"))
	if roomID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "roomId is required")
	}
	h.mu.Lock()
	delete(h.rooms, roomID)
	h.mu.Unlock()
	return appresponse.Success(c, fiber.Map{"cleared": true})
}
