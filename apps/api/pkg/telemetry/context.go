package telemetry

import (
	"context"

	"go.uber.org/zap"
)

type ctxKey uint8

const (
	keyCorrelationID ctxKey = iota + 1
	keyCausationID
	keyUserID
	keyCoachID
)

// WithCorrelationID returns a derived context carrying correlationID.
func WithCorrelationID(ctx context.Context, correlationID string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if correlationID == "" {
		return ctx
	}
	return context.WithValue(ctx, keyCorrelationID, correlationID)
}

// CorrelationID extracts the correlation ID from ctx, or empty string if unset.
func CorrelationID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(keyCorrelationID).(string)
	return v
}

// WithCausationID attaches an upstream event/message ID as causation ID.
func WithCausationID(ctx context.Context, causationID string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if causationID == "" {
		return ctx
	}
	return context.WithValue(ctx, keyCausationID, causationID)
}

// CausationID extracts the causation ID from ctx.
func CausationID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(keyCausationID).(string)
	return v
}

// WithActor attaches userID and coachID for structured logs and event propagation.
func WithActor(ctx context.Context, userID, coachID string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if userID != "" {
		ctx = context.WithValue(ctx, keyUserID, userID)
	}
	if coachID != "" {
		ctx = context.WithValue(ctx, keyCoachID, coachID)
	}
	return ctx
}

// UserID returns the user ID attached to ctx.
func UserID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(keyUserID).(string)
	return v
}

// CoachID returns the coach ID attached to ctx.
func CoachID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(keyCoachID).(string)
	return v
}

// ZapFields builds structured zap fields from telemetry values present on ctx.
func ZapFields(ctx context.Context) []zap.Field {
	if ctx == nil {
		return nil
	}
	fields := make([]zap.Field, 0, 4)
	if id := CorrelationID(ctx); id != "" {
		fields = append(fields, zap.String("correlation_id", id))
	}
	if cid := CausationID(ctx); cid != "" {
		fields = append(fields, zap.String("causation_id", cid))
	}
	if uid := UserID(ctx); uid != "" {
		fields = append(fields, zap.String("user_id", uid))
	}
	if coach := CoachID(ctx); coach != "" {
		fields = append(fields, zap.String("coach_id", coach))
	}
	return fields
}
