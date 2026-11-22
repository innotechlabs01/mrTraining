// Package media defines the domain model, visibility/purpose policies, and
// repository contract for Cloudflare R2 media objects.
package media

import (
	"context"
	"errors"
	"strings"
	"time"
)

type actorContextKey struct{}

// ActorContext carries RLS session attributes for media_objects queries.
type ActorContext struct {
	UserID  string
	CoachID string
	Role    string
}

// WithActorContext attaches ActorContext to ctx for PostgreSQL RLS enforcement.
func WithActorContext(ctx context.Context, a ActorContext) context.Context {
	return context.WithValue(ctx, actorContextKey{}, a)
}

// ActorFromContext extracts ActorContext from ctx (zero-value if unset).
func ActorFromContext(ctx context.Context) ActorContext {
	if v, ok := ctx.Value(actorContextKey{}).(ActorContext); ok {
		return v
	}
	return ActorContext{}
}

// CanonicalPrefix is the URI scheme stored in PostgreSQL columns for R2-backed media.
const CanonicalPrefix = "r2://"

// Visibility controls who can obtain a signed read URL for an object.
type Visibility string

const (
	VisibilityPrivate Visibility = "private"
	VisibilityTenant  Visibility = "tenant"
	VisibilityPublic  Visibility = "public"
)

// Status tracks the lifecycle of an uploaded object.
type Status string

const (
	StatusPending Status = "pending"
	StatusReady   Status = "ready"
	StatusDeleted Status = "deleted"
)

// Purpose identifies the domain feature owning an uploaded asset.
type Purpose string

const (
	PurposeExerciseVideo     Purpose = "exercise_video"
	PurposeExerciseImage     Purpose = "exercise_image"
	PurposeChallengeDemo     Purpose = "challenge_demo"
	PurposeCoachFeedMedia    Purpose = "coach_feed_media"
	PurposeLandingMedia      Purpose = "landing_media"
	PurposeCoachLandingMedia Purpose = "coach_landing_media"
	PurposeBlogCover         Purpose = "blog_cover"
	PurposeProductImage      Purpose = "product_image"
	PurposeFormRecording     Purpose = "form_recording"
	PurposeChallengeAttempt  Purpose = "challenge_attempt"
	PurposeSupportAttachment Purpose = "support_attachment"
	PurposeAvatar            Purpose = "avatar"
)

// MediaKind classifies whether a purpose accepts images, videos, or both.
type MediaKind string

const (
	KindImage MediaKind = "image"
	KindVideo MediaKind = "video"
	KindBoth  MediaKind = "both"
)

// PurposePolicy defines authorization, media kind, and visibility for a Purpose.
type PurposePolicy struct {
	Purpose        Purpose
	Visibility     Visibility
	Kind           MediaKind
	RequireCoach   bool
	RequireAthlete bool
}

// Policies maps each supported upload purpose to its security and validation policy.
var Policies = map[Purpose]PurposePolicy{
	PurposeExerciseVideo:     {Purpose: PurposeExerciseVideo, Visibility: VisibilityTenant, Kind: KindVideo, RequireCoach: true},
	PurposeExerciseImage:     {Purpose: PurposeExerciseImage, Visibility: VisibilityTenant, Kind: KindImage, RequireCoach: true},
	PurposeChallengeDemo:     {Purpose: PurposeChallengeDemo, Visibility: VisibilityTenant, Kind: KindVideo, RequireCoach: true},
	PurposeCoachFeedMedia:    {Purpose: PurposeCoachFeedMedia, Visibility: VisibilityTenant, Kind: KindBoth, RequireCoach: true},
	PurposeLandingMedia:      {Purpose: PurposeLandingMedia, Visibility: VisibilityPublic, Kind: KindBoth, RequireCoach: true},
	PurposeCoachLandingMedia: {Purpose: PurposeCoachLandingMedia, Visibility: VisibilityPublic, Kind: KindBoth, RequireCoach: true},
	PurposeBlogCover:         {Purpose: PurposeBlogCover, Visibility: VisibilityPublic, Kind: KindImage, RequireCoach: true},
	PurposeProductImage:      {Purpose: PurposeProductImage, Visibility: VisibilityPublic, Kind: KindImage, RequireCoach: true},
	PurposeFormRecording:     {Purpose: PurposeFormRecording, Visibility: VisibilityPrivate, Kind: KindVideo, RequireAthlete: true},
	PurposeChallengeAttempt:  {Purpose: PurposeChallengeAttempt, Visibility: VisibilityPrivate, Kind: KindVideo, RequireAthlete: true},
	PurposeSupportAttachment: {Purpose: PurposeSupportAttachment, Visibility: VisibilityPrivate, Kind: KindImage},
	PurposeAvatar:            {Purpose: PurposeAvatar, Visibility: VisibilityTenant, Kind: KindImage},
}

// MediaObject represents a tracked object stored in Cloudflare R2.
type MediaObject struct {
	ID          string
	ObjectKey   string
	Bucket      string
	OwnerUserID string
	CoachID     string
	Purpose     Purpose
	Visibility  Visibility
	ContentType string
	SizeBytes   int64
	Status      Status
	ResourceID  string
	CreatedAt   time.Time
	ConfirmedAt *time.Time
	DeletedAt   *time.Time
}

// Ref returns the canonical r2://<object_key> reference for this object.
func (m *MediaObject) Ref() string {
	return CanonicalPrefix + m.ObjectKey
}

// ParseRef extracts the object key from an r2://<object_key> reference.
// Returns ("", false) if raw is not an r2:// reference or contains unsafe segments.
func ParseRef(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if !strings.HasPrefix(trimmed, CanonicalPrefix) {
		return "", false
	}
	key := strings.TrimPrefix(trimmed, CanonicalPrefix)
	if key == "" || strings.Contains(key, "..") || strings.ContainsAny(key, " \t\n\r?#") || strings.HasPrefix(key, "/") {
		return "", false
	}
	return key, true
}

// Domain errors.
var (
	ErrNotFound         = errors.New("media object not found")
	ErrForbidden        = errors.New("forbidden access to media object")
	ErrInvalidPurpose   = errors.New("invalid media purpose")
	ErrInvalidMediaType = errors.New("unsupported media content type")
	ErrFileTooLarge     = errors.New("media file exceeds maximum allowed size")
	ErrMagicMismatch    = errors.New("media file content does not match declared type")
	ErrObjectMissing    = errors.New("uploaded object not found in storage")
)
