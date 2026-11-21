package workers

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	errdomain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	gamifdomain "github.com/innotechlabs01/mr-training-api/internal/domain/gamification"
	notifdomain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	paymentledgerdomain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/expo"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

type stubCheckouts struct {
	paidID, failedID string
}

func (s *stubCheckouts) MarkPaid(_ context.Context, id, _ string, _ float64, _ string) error {
	s.paidID = id
	return nil
}
func (s *stubCheckouts) MarkFailed(_ context.Context, id, _ string) error {
	s.failedID = id
	return nil
}

type stubLedger struct{ recorded []string }

func (s *stubLedger) GetActiveTerm(context.Context, string, string) (*paymentledgerdomain.CommissionTerm, error) {
	return &paymentledgerdomain.CommissionTerm{RateBps: 500, FixedFeeCents: 100}, nil
}
func (s *stubLedger) RecordPayment(_ context.Context, in paymentledgerdomain.CreateLedgerEntryInput, _ string) (*paymentledgerdomain.LedgerEntry, error) {
	s.recorded = append(s.recorded, in.WompiTransactionID)
	return &paymentledgerdomain.LedgerEntry{GrossAmountCents: in.GrossAmountCents, CoachNetPayableCents: 9000}, nil
}

type stubCommission struct{ count int }

func (s *stubCommission) CreateCommissionEntryDirect(context.Context, commissionentrydomain.CreateCommissionEntryInput, string) (*commissionentrydomain.CommissionEntry, error) {
	s.count++
	return &commissionentrydomain.CommissionEntry{}, nil
}

type stubMetadata struct {
	userID string
	patch  map[string]interface{}
}

func (s *stubMetadata) MergePublicMetadata(_ context.Context, userID string, patch map[string]interface{}) error {
	s.userID = userID
	s.patch = patch
	return nil
}

type stubDevices struct {
	list        []*notifdomain.Device
	deactivated []string
}

func (s *stubDevices) ListDevicesByUser(context.Context, string) ([]*notifdomain.Device, error) {
	return s.list, nil
}
func (s *stubDevices) DeactivateDevice(_ context.Context, id string) error {
	s.deactivated = append(s.deactivated, id)
	return nil
}

type stubExpo struct{}

func (stubExpo) SendToMultipleWithReport(context.Context, []string, string, string, map[string]string) ([]expo.PushResult, error) {
	return []expo.PushResult{
		{Token: "ExponentPushToken[ok]", Status: "ok"},
		{Token: "ExponentPushToken[stale]", Status: "error", Error: "DeviceNotRegistered"},
	}, nil
}

type stubDiscord struct{ sentTitle string }

func (s *stubDiscord) Send(_ context.Context, e *errdomain.Error) (string, string, error) {
	s.sentTitle = e.Title
	return "msg-1", "ch-1", nil
}

type stubGarmin struct{ users []string }

func (s *stubGarmin) SyncFromProvider(_ context.Context, _, userID string, _, _ time.Time) (int, error) {
	s.users = append(s.users, userID)
	return 2, nil
}

type stubGamif struct{ logged, checked int }

func (s *stubGamif) LogWorkoutDay(context.Context, string, string, *string) (*gamifdomain.Streak, error) {
	s.logged++
	return &gamifdomain.Streak{}, nil
}
func (s *stubGamif) CheckBadges(context.Context, string, int, int, int) ([]*gamifdomain.Badge, error) {
	s.checked++
	return nil, nil
}

func TestWorkers_AllConsumersProcessDomainEvents(t *testing.T) {
	bus := eventbus.NewInMemoryBus()
	checkouts := &stubCheckouts{}
	ledger := &stubLedger{}
	comm := &stubCommission{}
	meta := &stubMetadata{}
	invalidated := ""
	devs := &stubDevices{list: []*notifdomain.Device{
		{ID: "d1", Token: "ExponentPushToken[ok]"},
		{ID: "d2", Token: "ExponentPushToken[stale]"},
	}}
	discord := &stubDiscord{}
	garmin := &stubGarmin{}
	gamif := &stubGamif{}

	subs, err := StartAll(context.Background(), bus, WorkerDeps{
		Checkouts:      checkouts,
		Ledger:         ledger,
		Commission:     comm,
		Metadata:       meta,
		InvalidateRole: func(u string) { invalidated = u },
		Devices:        devs,
		ExpoPush:       stubExpo{},
		Discord:        discord,
		Garmin:         garmin,
		Gamification:   gamif,
	}, zap.NewNop())
	require.NoError(t, err)
	require.Len(t, subs, 8)

	ctx := context.Background()
	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectPaymentApproved, "subscription", "sub-1", map[string]interface{}{
		"subscription_id":     "sub-1",
		"provider_payment_id": "pay-1",
		"coach_id":            "coach-1",
		"athlete_id":          "ath-1",
		"gross_amount_cents":  int64(10000),
		"currency":            "COP",
	})))
	require.Equal(t, []string{"pay-1"}, ledger.recorded)
	require.Equal(t, 1, comm.count)

	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectCheckoutPaid, "checkout", "chk-1", map[string]interface{}{
		"checkout_id": "chk-1", "provider_payment_id": "pay-2", "amount": 50.0, "currency": "USD",
	})))
	require.Equal(t, "chk-1", checkouts.paidID)

	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectClerkMetadataSyncRequest, "user", "u-1", map[string]interface{}{
		"user_id": "u-1", "plan": "pro", "planStatus": "active",
	})))
	require.Equal(t, "u-1", meta.userID)
	require.Equal(t, "u-1", invalidated)

	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectNotificationRequested, "notification", "n-1", map[string]interface{}{
		"user_id": "u-1", "title": "Hola", "message": "Tu plan está activo",
	})))
	require.Equal(t, []string{"d2"}, devs.deactivated)

	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectErrorReported, "error", "err-1", map[string]interface{}{
		"id": "err-1", "title": "Payment timeout",
	})))
	require.Equal(t, "Payment timeout", discord.sentTitle)

	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectGarminSyncRequested, "wearable", "u-garmin", map[string]interface{}{
		"user_id": "u-garmin",
	})))
	require.Equal(t, []string{"u-garmin"}, garmin.users)

	require.NoError(t, bus.Publish(ctx, eventbus.NewEvent(ctx, eventbus.SubjectWorkoutCompleted, "workout", "w-1", map[string]interface{}{
		"athlete_id": "ath-1", "workout_id": "w-1",
	})))
	require.Equal(t, 1, gamif.logged)
	require.Equal(t, 1, gamif.checked)

	// Poison clerk event marks non-retryable
	err = NewClerkSyncConsumer(WorkerDeps{Metadata: meta}, zap.NewNop()).Handle(ctx, eventbus.DomainEvent{EventID: "bad"})
	require.True(t, errors.Is(err, err) && resilience.IsNonRetryable(err))
}
