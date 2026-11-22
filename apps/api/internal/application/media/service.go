// Package media implements use cases for Cloudflare R2 presigned uploads,
// server-side upload confirmation (magic-byte + size verification), batched
// authenticated read signing, and IDOR/ownership validation.
package media

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/media"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/storage"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/mediautil"
)

const (
	defaultUploadTTL     = 15 * time.Minute
	defaultReadTTL       = 60 * time.Minute
	defaultPublicViewTTL = 15 * time.Minute
	defaultMaxImageBytes = int64(10 * 1024 * 1024)  // 10 MB
	defaultMaxVideoBytes = int64(100 * 1024 * 1024) // 100 MB
	maxBatchReadRefs     = 50
)

// Options configures TTLs and size limits for the media service.
type Options struct {
	UploadTTL     time.Duration
	ReadTTL       time.Duration
	PublicViewTTL time.Duration
	MaxImageBytes int64
	MaxVideoBytes int64
}

// Actor identifies the authenticated caller invoking a media use case.
type Actor struct {
	UserID  string
	CoachID string
	Role    string
}

// PresignUploadInput contains metadata for requesting an R2 PUT signature.
type PresignUploadInput struct {
	Purpose     string
	Filename    string
	ContentType string
	SizeBytes   int64
	ResourceID  string
}

// PresignUploadResult is returned to the client for direct browser/mobile PUT.
type PresignUploadResult struct {
	MediaID    string            `json:"media_id"`
	ObjectKey  string            `json:"object_key"`
	MediaRef   string            `json:"media_ref"`
	UploadURL  string            `json:"upload_url"`
	Headers    map[string]string `json:"headers"`
	ExpiresAt  time.Time         `json:"expires_at"`
}

// ConfirmUploadInput identifies an uploaded object to verify and finalize.
type ConfirmUploadInput struct {
	MediaID   string
	ObjectKey string
}

// ConfirmUploadResult returns the canonical r2:// reference and a preview URL.
type ConfirmUploadResult struct {
	MediaID    string    `json:"media_id"`
	ObjectKey  string    `json:"object_key"`
	MediaRef   string    `json:"media_ref"`
	PreviewURL string    `json:"preview_url"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// SignedReadEntry represents a single resolved presigned GET URL.
type SignedReadEntry struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Service orchestrates R2 presigning, verification, and authorization.
type Service struct {
	repo    domain.Repository
	storage storage.ObjectStorage
	opts    Options
}

// NewService constructs a media Service with safe defaults.
func NewService(repo domain.Repository, store storage.ObjectStorage, opts Options) *Service {
	if opts.UploadTTL <= 0 {
		opts.UploadTTL = defaultUploadTTL
	}
	if opts.ReadTTL <= 0 {
		opts.ReadTTL = defaultReadTTL
	}
	if opts.PublicViewTTL <= 0 {
		opts.PublicViewTTL = defaultPublicViewTTL
	}
	if opts.MaxImageBytes <= 0 {
		opts.MaxImageBytes = defaultMaxImageBytes
	}
	if opts.MaxVideoBytes <= 0 {
		opts.MaxVideoBytes = defaultMaxVideoBytes
	}
	return &Service{
		repo:    repo,
		storage: store,
		opts:    opts,
	}
}

// Enabled reports whether backing R2 storage is configured.
func (s *Service) Enabled() bool {
	return s != nil && s.storage != nil && s.storage.Enabled()
}

// PresignUpload validates the caller, purpose, MIME type, and size, creates a
// pending media_objects row, and returns a short-lived SigV4 PUT URL.
func (s *Service) PresignUpload(ctx context.Context, actor Actor, in PresignUploadInput) (*PresignUploadResult, error) {
	if !s.Enabled() {
		return nil, storage.ErrStorageNotConfigured
	}
	if actor.UserID == "" {
		return nil, domain.ErrForbidden
	}
	ctx = withActorRLS(ctx, actor)

	policy, ok := domain.Policies[domain.Purpose(strings.TrimSpace(in.Purpose))]
	if !ok {
		return nil, domain.ErrInvalidPurpose
	}

	if err := authorizePurpose(actor, policy); err != nil {
		return nil, err
	}

	ext, maxBytes, err := s.validateMediaTypeAndSize(policy.Kind, in.Filename, in.ContentType, in.SizeBytes)
	if err != nil {
		return nil, err
	}
	_ = maxBytes

	mediaID := uuid.NewString()
	objectKey := buildObjectKey(actor, policy.Purpose, mediaID, ext)
	now := time.Now().UTC()

	coachID := actor.CoachID
	if coachID == "" && isCoachOrAdmin(actor.Role) {
		coachID = actor.UserID
	}

	obj := &domain.MediaObject{
		ID:          mediaID,
		ObjectKey:   objectKey,
		Bucket:      s.storage.Bucket(),
		OwnerUserID: actor.UserID,
		CoachID:     coachID,
		Purpose:     policy.Purpose,
		Visibility:  policy.Visibility,
		ContentType: normalizeContentType(in.ContentType),
		SizeBytes:   in.SizeBytes,
		Status:      domain.StatusPending,
		ResourceID:  strings.TrimSpace(in.ResourceID),
		CreatedAt:   now,
	}

	if err := s.repo.Create(ctx, obj); err != nil {
		return nil, fmt.Errorf("create pending media object: %w", err)
	}

	uploadURL, err := s.storage.PresignPut(ctx, objectKey, obj.ContentType, s.opts.UploadTTL)
	if err != nil {
		return nil, fmt.Errorf("presign upload: %w", err)
	}

	return &PresignUploadResult{
		MediaID:   obj.ID,
		ObjectKey: obj.ObjectKey,
		MediaRef:  obj.Ref(),
		UploadURL: uploadURL,
		Headers: map[string]string{
			"Content-Type": obj.ContentType,
		},
		ExpiresAt: now.Add(s.opts.UploadTTL),
	}, nil
}

// ConfirmUpload verifies that the object exists in R2, respects the size limit,
// and passes magic-byte header inspection, then marks it ready and returns a preview URL.
func (s *Service) ConfirmUpload(ctx context.Context, actor Actor, in ConfirmUploadInput) (*ConfirmUploadResult, error) {
	if !s.Enabled() {
		return nil, storage.ErrStorageNotConfigured
	}
	if actor.UserID == "" {
		return nil, domain.ErrForbidden
	}
	ctx = withActorRLS(ctx, actor)

	var (
		obj *domain.MediaObject
		err error
	)
	if strings.TrimSpace(in.MediaID) != "" {
		obj, err = s.repo.GetByID(ctx, strings.TrimSpace(in.MediaID))
	} else if strings.TrimSpace(in.ObjectKey) != "" {
		key := strings.TrimPrefix(strings.TrimSpace(in.ObjectKey), domain.CanonicalPrefix)
		obj, err = s.repo.GetByKey(ctx, key)
	} else {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if obj.OwnerUserID != actor.UserID && !isAdmin(actor.Role) {
		return nil, domain.ErrForbidden
	}
	if obj.Status == domain.StatusDeleted {
		return nil, domain.ErrNotFound
	}

	policy, ok := domain.Policies[obj.Purpose]
	if !ok {
		return nil, domain.ErrInvalidPurpose
	}

	meta, err := s.storage.HeadObject(ctx, obj.ObjectKey)
	if err != nil {
		return nil, domain.ErrObjectMissing
	}

	maxAllowed := s.maxBytesForContentType(obj.ContentType, policy.Kind)
	if meta.ContentLength <= 0 || meta.ContentLength > maxAllowed {
		_ = s.storage.DeleteObject(ctx, obj.ObjectKey)
		return nil, domain.ErrFileTooLarge
	}

	ext, ok := mediautil.CanonicalExtForMIME(obj.ContentType)
	if !ok {
		_ = s.storage.DeleteObject(ctx, obj.ObjectKey)
		return nil, domain.ErrInvalidMediaType
	}

	headerBytes, err := s.storage.GetObjectRange(ctx, obj.ObjectKey, 0, 511)
	if err != nil {
		return nil, fmt.Errorf("read uploaded header: %w", err)
	}
	if err := mediautil.ValidateMagicHeaderBytes(headerBytes, ext); err != nil {
		_ = s.storage.DeleteObject(ctx, obj.ObjectKey)
		return nil, domain.ErrMagicMismatch
	}

	now := time.Now().UTC()
	ct := obj.ContentType
	if meta.ContentType != "" && meta.ContentType != "application/octet-stream" {
		ct = normalizeContentType(meta.ContentType)
	}
	if err := s.repo.MarkReady(ctx, obj.ID, meta.ContentLength, ct, now); err != nil {
		return nil, err
	}

	previewURL, err := s.storage.PresignGet(ctx, obj.ObjectKey, s.opts.ReadTTL)
	if err != nil {
		return nil, fmt.Errorf("presign preview url: %w", err)
	}

	return &ConfirmUploadResult{
		MediaID:    obj.ID,
		ObjectKey:  obj.ObjectKey,
		MediaRef:   obj.Ref(),
		PreviewURL: previewURL,
		ExpiresAt:  now.Add(s.opts.ReadTTL),
	}, nil
}

// PresignReadBatch resolves up to 50 canonical r2:// references into signed GET URLs
// after verifying that the actor is authorized to read each object.
func (s *Service) PresignReadBatch(ctx context.Context, actor Actor, refs []string) (map[string]SignedReadEntry, error) {
	if !s.Enabled() {
		return nil, storage.ErrStorageNotConfigured
	}
	if actor.UserID == "" {
		return nil, domain.ErrForbidden
	}
	ctx = withActorRLS(ctx, actor)

	if len(refs) > maxBatchReadRefs {
		refs = refs[:maxBatchReadRefs]
	}

	keyToRefs := make(map[string][]string, len(refs))
	keys := make([]string, 0, len(refs))
	for _, raw := range refs {
		key, ok := domain.ParseRef(raw)
		if !ok {
			continue
		}
		if _, seen := keyToRefs[key]; !seen {
			keys = append(keys, key)
		}
		keyToRefs[key] = append(keyToRefs[key], raw)
	}

	out := make(map[string]SignedReadEntry, len(keys))
	if len(keys) == 0 {
		return out, nil
	}

	objs, err := s.repo.GetByKeys(ctx, keys)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	expiresAt := now.Add(s.opts.ReadTTL)
	for _, obj := range objs {
		if obj.Status != domain.StatusReady {
			continue
		}
		allowed, err := s.canReadObject(ctx, actor, obj)
		if err != nil || !allowed {
			continue
		}
		signedURL, err := s.storage.PresignGet(ctx, obj.ObjectKey, s.opts.ReadTTL)
		if err != nil {
			continue
		}
		for _, originalRef := range keyToRefs[obj.ObjectKey] {
			out[originalRef] = SignedReadEntry{
				URL:       signedURL,
				ExpiresAt: expiresAt,
			}
		}
	}

	return out, nil
}

// ResolvePublicView returns a short-lived signed GET URL for a public, ready object.
func (s *Service) ResolvePublicView(ctx context.Context, rawKey string) (string, error) {
	if !s.Enabled() {
		return "", storage.ErrStorageNotConfigured
	}
	key := strings.TrimPrefix(strings.TrimSpace(rawKey), domain.CanonicalPrefix)
	if key == "" || strings.Contains(key, "..") {
		return "", domain.ErrNotFound
	}
	obj, err := s.repo.GetByKey(ctx, key)
	if err != nil {
		return "", err
	}
	if obj.Status != domain.StatusReady || obj.Visibility != domain.VisibilityPublic {
		return "", domain.ErrNotFound
	}
	return s.storage.PresignGet(ctx, obj.ObjectKey, s.opts.PublicViewTTL)
}

// Delete soft-deletes the media_objects record and removes the object from R2.
func (s *Service) Delete(ctx context.Context, actor Actor, id string) error {
	if !s.Enabled() {
		return storage.ErrStorageNotConfigured
	}
	ctx = withActorRLS(ctx, actor)
	obj, err := s.repo.GetByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return err
	}
	if obj.OwnerUserID != actor.UserID && !isAdmin(actor.Role) {
		return domain.ErrForbidden
	}
	if err := s.storage.DeleteObject(ctx, obj.ObjectKey); err != nil {
		return fmt.Errorf("delete from r2: %w", err)
	}
	return s.repo.MarkDeleted(ctx, obj.ID, time.Now().UTC())
}

// StoreStream uploads a verified stream directly to R2 and records it as ready.
// Used by legacy multipart endpoints so they never write to local disk.
func (s *Service) StoreStream(ctx context.Context, actor Actor, purpose, filename, contentType string, sizeBytes int64, body io.Reader) (*domain.MediaObject, error) {
	if !s.Enabled() {
		return nil, storage.ErrStorageNotConfigured
	}
	ctx = withActorRLS(ctx, actor)
	policy, ok := domain.Policies[domain.Purpose(purpose)]
	if !ok {
		return nil, domain.ErrInvalidPurpose
	}
	if err := authorizePurpose(actor, policy); err != nil {
		return nil, err
	}
	ext, _, err := s.validateMediaTypeAndSize(policy.Kind, filename, contentType, sizeBytes)
	if err != nil {
		return nil, err
	}

	header := make([]byte, 512)
	n, rerr := io.ReadFull(body, header)
	if rerr != nil && !errors.Is(rerr, io.ErrUnexpectedEOF) && !errors.Is(rerr, io.EOF) {
		return nil, fmt.Errorf("read upload header: %w", rerr)
	}
	header = header[:n]
	if err := mediautil.ValidateMagicHeaderBytes(header, ext); err != nil {
		return nil, domain.ErrMagicMismatch
	}

	mediaID := uuid.NewString()
	objectKey := buildObjectKey(actor, policy.Purpose, mediaID, ext)
	ct := normalizeContentType(contentType)
	fullBody := io.MultiReader(bytes.NewReader(header), body)
	if err := s.storage.PutObject(ctx, objectKey, ct, fullBody, sizeBytes); err != nil {
		return nil, fmt.Errorf("put object to r2: %w", err)
	}

	now := time.Now().UTC()
	coachID := actor.CoachID
	if coachID == "" && isCoachOrAdmin(actor.Role) {
		coachID = actor.UserID
	}

	obj := &domain.MediaObject{
		ID:          mediaID,
		ObjectKey:   objectKey,
		Bucket:      s.storage.Bucket(),
		OwnerUserID: actor.UserID,
		CoachID:     coachID,
		Purpose:     policy.Purpose,
		Visibility:  policy.Visibility,
		ContentType: ct,
		SizeBytes:   sizeBytes,
		Status:      domain.StatusReady,
		CreatedAt:   now,
		ConfirmedAt: &now,
	}
	if err := s.repo.Create(ctx, obj); err != nil {
		_ = s.storage.DeleteObject(ctx, objectKey)
		return nil, err
	}
	return obj, nil
}

// NormalizeAndValidateRef canonicalizes accidental R2 presigned URLs back to
// r2://<object_key> and verifies that the actor owns or can reference any r2:// key.
// Non-R2 http(s):// and /uploads/ URLs pass through unchanged; unsafe schemes are rejected.
func (s *Service) NormalizeAndValidateRef(ctx context.Context, actor Actor, raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}
	ctx = withActorRLS(ctx, actor)

	// If someone accidentally submitted a presigned R2 URL, extract its object key.
	if strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "http://") {
		if key, ok := extractR2KeyFromPresignedURL(trimmed, s.storage.Bucket()); ok {
			trimmed = domain.CanonicalPrefix + key
		} else {
			return trimmed, nil
		}
	}

	if strings.HasPrefix(trimmed, "/uploads/") {
		if strings.Contains(trimmed, "..") || strings.ContainsAny(trimmed, " \t\n\r") {
			return "", domain.ErrInvalidMediaType
		}
		return trimmed, nil
	}

	if !strings.HasPrefix(trimmed, domain.CanonicalPrefix) {
		return "", domain.ErrInvalidMediaType
	}

	key, ok := domain.ParseRef(trimmed)
	if !ok {
		return "", domain.ErrForbidden
	}

	obj, err := s.repo.GetByKey(ctx, key)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return "", domain.ErrForbidden
		}
		return "", err
	}
	if obj.Status != domain.StatusReady {
		return "", domain.ErrNotFound
	}
	if obj.OwnerUserID == actor.UserID || isAdmin(actor.Role) {
		return obj.Ref(), nil
	}
	if actor.CoachID != "" && obj.CoachID == actor.CoachID && isCoachOrAdmin(actor.Role) {
		return obj.Ref(), nil
	}
	return "", domain.ErrForbidden
}

func (s *Service) canReadObject(ctx context.Context, actor Actor, obj *domain.MediaObject) (bool, error) {
	if isAdmin(actor.Role) {
		return true, nil
	}
	if obj.OwnerUserID == actor.UserID {
		return true, nil
	}
	if obj.Visibility == domain.VisibilityPublic {
		return true, nil
	}
	if obj.Visibility == domain.VisibilityTenant && obj.CoachID != "" {
		if actor.CoachID == obj.CoachID {
			return true, nil
		}
		linked, err := s.repo.HasActiveCoachAthleteLink(ctx, obj.CoachID, actor.UserID)
		if err != nil {
			return false, err
		}
		if linked {
			return true, nil
		}
	}
	if (obj.Purpose == domain.PurposeFormRecording || obj.Purpose == domain.PurposeChallengeAttempt) && isCoachOrAdmin(actor.Role) {
		coachID := actor.CoachID
		if coachID == "" {
			coachID = actor.UserID
		}
		linked, err := s.repo.HasActiveCoachAthleteLink(ctx, coachID, obj.OwnerUserID)
		if err != nil {
			return false, err
		}
		if linked {
			return true, nil
		}
	}
	if obj.Purpose == domain.PurposeSupportAttachment {
		return s.repo.IsSupportTicketParticipant(ctx, actor.UserID, obj.Ref())
	}
	return false, nil
}

func withActorRLS(ctx context.Context, actor Actor) context.Context {
	return domain.WithActorContext(ctx, domain.ActorContext{
		UserID:  actor.UserID,
		CoachID: actor.CoachID,
		Role:    actor.Role,
	})
}

func (s *Service) validateMediaTypeAndSize(kind domain.MediaKind, filename, contentType string, sizeBytes int64) (string, int64, error) {
	ct := normalizeContentType(contentType)
	isImg := mediautil.IsImageMIME(ct)
	isVid := mediautil.IsVideoMIME(ct)

	switch kind {
	case domain.KindImage:
		if !isImg {
			return "", 0, domain.ErrInvalidMediaType
		}
	case domain.KindVideo:
		if !isVid {
			return "", 0, domain.ErrInvalidMediaType
		}
	case domain.KindBoth:
		if !isImg && !isVid {
			return "", 0, domain.ErrInvalidMediaType
		}
	default:
		return "", 0, domain.ErrInvalidPurpose
	}

	if !mediautil.ExtMatchesMIME(filename, ct) {
		return "", 0, domain.ErrInvalidMediaType
	}

	ext, ok := mediautil.CanonicalExtForMIME(ct)
	if !ok {
		return "", 0, domain.ErrInvalidMediaType
	}

	maxBytes := s.maxBytesForContentType(ct, kind)
	if sizeBytes <= 0 || sizeBytes > maxBytes {
		return "", 0, domain.ErrFileTooLarge
	}

	return ext, maxBytes, nil
}

func (s *Service) maxBytesForContentType(ct string, kind domain.MediaKind) int64 {
	if mediautil.IsVideoMIME(ct) || kind == domain.KindVideo {
		return s.opts.MaxVideoBytes
	}
	return s.opts.MaxImageBytes
}

func authorizePurpose(actor Actor, policy domain.PurposePolicy) error {
	if policy.RequireCoach && !isCoachOrAdmin(actor.Role) {
		return domain.ErrForbidden
	}
	if policy.RequireAthlete && actor.Role != "athlete" && !isCoachOrAdmin(actor.Role) {
		return domain.ErrForbidden
	}
	return nil
}

func isCoachOrAdmin(role string) bool {
	return role == "coach" || role == "admin" || role == "super_admin"
}

func isAdmin(role string) bool {
	return role == "admin" || role == "super_admin"
}

func normalizeContentType(ct string) string {
	if idx := strings.IndexByte(ct, ';'); idx >= 0 {
		ct = ct[:idx]
	}
	return strings.ToLower(strings.TrimSpace(ct))
}

func buildObjectKey(actor Actor, purpose domain.Purpose, mediaID, ext string) string {
	if isCoachOrAdmin(actor.Role) && actor.CoachID != "" {
		return fmt.Sprintf("coaches/%s/%s/%s%s", sanitizeSegment(actor.CoachID), purpose, mediaID, ext)
	}
	if actor.Role == "athlete" {
		return fmt.Sprintf("athletes/%s/%s/%s%s", sanitizeSegment(actor.UserID), purpose, mediaID, ext)
	}
	return fmt.Sprintf("users/%s/%s/%s%s", sanitizeSegment(actor.UserID), purpose, mediaID, ext)
}

func sanitizeSegment(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "unknown"
	}
	return b.String()
}

func extractR2KeyFromPresignedURL(rawURL, bucket string) (string, bool) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", false
	}
	if !strings.HasSuffix(strings.ToLower(u.Hostname()), ".r2.cloudflarestorage.com") {
		return "", false
	}
	path := strings.TrimPrefix(u.Path, "/")
	if bucket != "" && strings.HasPrefix(path, bucket+"/") {
		path = strings.TrimPrefix(path, bucket+"/")
	}
	if path == "" || strings.Contains(path, "..") {
		return "", false
	}
	return path, true
}
