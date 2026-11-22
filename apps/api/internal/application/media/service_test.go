package media

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/media"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/storage"
)

type memRepo struct {
	byID       map[string]*domain.MediaObject
	byKey      map[string]*domain.MediaObject
	links      map[string]bool
	ticketRefs map[string]bool
}

func newMemRepo() *memRepo {
	return &memRepo{
		byID:       make(map[string]*domain.MediaObject),
		byKey:      make(map[string]*domain.MediaObject),
		links:      make(map[string]bool),
		ticketRefs: make(map[string]bool),
	}
}

func (r *memRepo) Create(_ context.Context, obj *domain.MediaObject) error {
	cp := *obj
	r.byID[cp.ID] = &cp
	r.byKey[cp.ObjectKey] = &cp
	return nil
}

func (r *memRepo) GetByID(_ context.Context, id string) (*domain.MediaObject, error) {
	o, ok := r.byID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *o
	return &cp, nil
}

func (r *memRepo) GetByKey(_ context.Context, key string) (*domain.MediaObject, error) {
	o, ok := r.byKey[key]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *o
	return &cp, nil
}

func (r *memRepo) GetByKeys(_ context.Context, keys []string) ([]*domain.MediaObject, error) {
	var out []*domain.MediaObject
	for _, k := range keys {
		if o, ok := r.byKey[k]; ok {
			cp := *o
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (r *memRepo) MarkReady(_ context.Context, id string, sizeBytes int64, contentType string, confirmedAt time.Time) error {
	o, ok := r.byID[id]
	if !ok {
		return domain.ErrNotFound
	}
	o.Status = domain.StatusReady
	o.SizeBytes = sizeBytes
	o.ContentType = contentType
	o.ConfirmedAt = &confirmedAt
	return nil
}

func (r *memRepo) MarkDeleted(_ context.Context, id string, deletedAt time.Time) error {
	o, ok := r.byID[id]
	if !ok {
		return domain.ErrNotFound
	}
	o.Status = domain.StatusDeleted
	o.DeletedAt = &deletedAt
	return nil
}

func (r *memRepo) HasActiveCoachAthleteLink(_ context.Context, coachID, athleteUserID string) (bool, error) {
	return r.links[coachID+":"+athleteUserID], nil
}

func (r *memRepo) IsSupportTicketParticipant(_ context.Context, userID, objectRef string) (bool, error) {
	return r.ticketRefs[userID+":"+objectRef], nil
}

type fakeStorage struct {
	enabled     bool
	bucket      string
	headMeta    *storage.ObjectMeta
	rangeBytes  []byte
	deletedKeys []string
}

func (f *fakeStorage) Enabled() bool  { return f.enabled }
func (f *fakeStorage) Bucket() string { return f.bucket }
func (f *fakeStorage) PresignPut(_ context.Context, key, ct string, _ time.Duration) (string, error) {
	return "https://acct.r2.cloudflarestorage.com/" + f.bucket + "/" + key + "?X-Amz-Signature=putsig&ct=" + ct, nil
}
func (f *fakeStorage) PresignGet(_ context.Context, key string, _ time.Duration) (string, error) {
	return "https://acct.r2.cloudflarestorage.com/" + f.bucket + "/" + key + "?X-Amz-Signature=getsig", nil
}
func (f *fakeStorage) HeadObject(_ context.Context, _ string) (*storage.ObjectMeta, error) {
	if f.headMeta == nil {
		return nil, errors.New("missing")
	}
	return f.headMeta, nil
}
func (f *fakeStorage) GetObjectRange(_ context.Context, _ string, _, _ int64) ([]byte, error) {
	return f.rangeBytes, nil
}
func (f *fakeStorage) PutObject(_ context.Context, _, _ string, _ io.Reader, _ int64) error {
	return nil
}
func (f *fakeStorage) DeleteObject(_ context.Context, key string) error {
	f.deletedKeys = append(f.deletedKeys, key)
	return nil
}

func TestPresignUpload_CoachAndSecurityGuards(t *testing.T) {
	repo := newMemRepo()
	store := &fakeStorage{enabled: true, bucket: "mr-media"}
	svc := NewService(repo, store, Options{})

	// Athlete cannot request coach-only exercise_video
	_, err := svc.PresignUpload(context.Background(), Actor{UserID: "ath-1", Role: "athlete"}, PresignUploadInput{
		Purpose:     "exercise_video",
		Filename:    "squat.mp4",
		ContentType: "video/mp4",
		SizeBytes:   1024,
	})
	if !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden for athlete requesting exercise_video, got %v", err)
	}

	// Reject SVG XSS vector
	_, err = svc.PresignUpload(context.Background(), Actor{UserID: "coach-1", CoachID: "coach-1", Role: "coach"}, PresignUploadInput{
		Purpose:     "product_image",
		Filename:    "xss.svg",
		ContentType: "image/svg+xml",
		SizeBytes:   512,
	})
	if !errors.Is(err, domain.ErrInvalidMediaType) {
		t.Fatalf("expected ErrInvalidMediaType for svg, got %v", err)
	}

	// Valid coach upload
	res, err := svc.PresignUpload(context.Background(), Actor{UserID: "coach-1", CoachID: "coach-1", Role: "coach"}, PresignUploadInput{
		Purpose:     "exercise_video",
		Filename:    "squat.mp4",
		ContentType: "video/mp4",
		SizeBytes:   5_000_000,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(res.MediaRef, "r2://coaches/coach-1/exercise_video/") {
		t.Fatalf("unexpected media_ref: %s", res.MediaRef)
	}
}

func TestConfirmUpload_MagicBytesAndCleanup(t *testing.T) {
	repo := newMemRepo()
	store := &fakeStorage{
		enabled:    true,
		bucket:     "mr-media",
		headMeta:   &storage.ObjectMeta{ContentLength: 2048, ContentType: "video/mp4"},
		rangeBytes: []byte{0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00}, // MZ executable disguised as .mp4
	}
	svc := NewService(repo, store, Options{})
	actor := Actor{UserID: "coach-1", CoachID: "coach-1", Role: "coach"}

	up, err := svc.PresignUpload(context.Background(), actor, PresignUploadInput{
		Purpose:     "exercise_video",
		Filename:    "evil.mp4",
		ContentType: "video/mp4",
		SizeBytes:   2048,
	})
	if err != nil {
		t.Fatalf("presign failed: %v", err)
	}

	_, err = svc.ConfirmUpload(context.Background(), actor, ConfirmUploadInput{MediaID: up.MediaID})
	if !errors.Is(err, domain.ErrMagicMismatch) {
		t.Fatalf("expected ErrMagicMismatch, got %v", err)
	}
	if len(store.deletedKeys) != 1 || store.deletedKeys[0] != up.ObjectKey {
		t.Fatalf("expected invalid R2 object to be deleted, got %v", store.deletedKeys)
	}

	// Now valid MP4 ftyp header
	store.deletedKeys = nil
	store.rangeBytes = []byte{0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'm', 'p', '4', '2'}
	conf, err := svc.ConfirmUpload(context.Background(), actor, ConfirmUploadInput{MediaID: up.MediaID})
	if err != nil {
		t.Fatalf("expected confirm to succeed, got %v", err)
	}
	if conf.MediaRef != up.MediaRef || !strings.Contains(conf.PreviewURL, "X-Amz-Signature=getsig") {
		t.Fatalf("unexpected confirm result: %+v", conf)
	}
}

func TestPresignReadBatch_TenantIsolation(t *testing.T) {
	repo := newMemRepo()
	repo.links["coach-A:ath-A"] = true
	now := time.Now().UTC()
	_ = repo.Create(context.Background(), &domain.MediaObject{
		ID:          "m1",
		ObjectKey:   "coaches/coach-A/exercise_video/m1.mp4",
		Bucket:      "mr-media",
		OwnerUserID: "coach-A",
		CoachID:     "coach-A",
		Purpose:     domain.PurposeExerciseVideo,
		Visibility:  domain.VisibilityTenant,
		ContentType: "video/mp4",
		SizeBytes:   1000,
		Status:      domain.StatusReady,
		CreatedAt:   now,
	})

	store := &fakeStorage{enabled: true, bucket: "mr-media"}
	svc := NewService(repo, store, Options{})

	// Linked athlete A can read
	resA, err := svc.PresignReadBatch(context.Background(), Actor{UserID: "ath-A", Role: "athlete"}, []string{"r2://coaches/coach-A/exercise_video/m1.mp4"})
	if err != nil || len(resA) != 1 {
		t.Fatalf("expected athlete A to read tenant media, got len=%d err=%v", len(resA), err)
	}

	// Unlinked athlete B cannot read
	resB, err := svc.PresignReadBatch(context.Background(), Actor{UserID: "ath-B", Role: "athlete"}, []string{"r2://coaches/coach-A/exercise_video/m1.mp4"})
	if err != nil || len(resB) != 0 {
		t.Fatalf("expected athlete B to be denied, got len=%d err=%v", len(resB), err)
	}
}
