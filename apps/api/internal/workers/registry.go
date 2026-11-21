package workers

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"go.uber.org/zap"

	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	errdomain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	gamifdomain "github.com/innotechlabs01/mr-training-api/internal/domain/gamification"
	notifdomain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	paymentledgerdomain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/expo"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

// CheckoutRecorder updates pending checkout payment state asynchronously.
type CheckoutRecorder interface {
	MarkPaid(ctx context.Context, checkoutID, providerPaymentID string, amount float64, currency string) error
	MarkFailed(ctx context.Context, checkoutID, providerPaymentID string) error
}

// LedgerRecorder records approved subscription payments in the financial ledger.
type LedgerRecorder interface {
	GetActiveTerm(ctx context.Context, coachID, at string) (*paymentledgerdomain.CommissionTerm, error)
	RecordPayment(ctx context.Context, in paymentledgerdomain.CreateLedgerEntryInput, actorID string) (*paymentledgerdomain.LedgerEntry, error)
}

// CommissionWriter persists coach commission entries asynchronously.
type CommissionWriter interface {
	CreateCommissionEntryDirect(ctx context.Context, in commissionentrydomain.CreateCommissionEntryInput, actorID string) (*commissionentrydomain.CommissionEntry, error)
}

// MetadataWriter syncs user public metadata with the auth provider (Clerk).
type MetadataWriter interface {
	MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error
}

// DeviceRepository reads and deactivates user push devices.
type DeviceRepository interface {
	ListDevicesByUser(ctx context.Context, userID string) ([]*notifdomain.Device, error)
	DeactivateDevice(ctx context.Context, id string) error
}

// ExpoPushReporter delivers notifications through Expo Push API with per-token receipts.
type ExpoPushReporter interface {
	SendToMultipleWithReport(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]expo.PushResult, error)
}

// FCMPushSender delivers notifications through Firebase Cloud Messaging.
type FCMPushSender interface {
	SendToMultiple(ctx context.Context, tokens []string, title, body string, data map[string]string) error
}

// DiscordNotifier sends error notifications to Discord webhooks.
type DiscordNotifier interface {
	Send(ctx context.Context, e *errdomain.Error) (messageID, channelID string, err error)
}

// GarminSyncer executes Garmin provider syncs asynchronously.
type GarminSyncer interface {
	SyncFromProvider(ctx context.Context, providerName, userID string, from, to time.Time) (int, error)
}

// GamificationTracker records workout streaks and evaluates badge unlocks.
type GamificationTracker interface {
	LogWorkoutDay(ctx context.Context, athleteID, workoutDate string, workoutID *string) (*gamifdomain.Streak, error)
	CheckBadges(ctx context.Context, athleteID string, totalWorkouts int, totalPRs int, feedInteractions int) ([]*gamifdomain.Badge, error)
}

// WorkerDeps bundles all ports needed by the background domain consumers.
type WorkerDeps struct {
	DB               *sql.DB
	Outbox           eventbus.OutboxWriter
	Checkouts        CheckoutRecorder
	Ledger           LedgerRecorder
	Commission       CommissionWriter
	Metadata         MetadataWriter
	InvalidateRole   func(userID string)
	Devices          DeviceRepository
	ExpoPush         ExpoPushReporter
	FCMPush          FCMPushSender
	Discord          DiscordNotifier
	SuperAdminUserID string
	Garmin           GarminSyncer
	Gamification     GamificationTracker
}

// StartAll registers every durable domain consumer on sub and returns active subscriptions.
func StartAll(ctx context.Context, sub eventbus.Subscriber, deps WorkerDeps, log *zap.Logger) ([]eventbus.Subscription, error) {
	if sub == nil {
		return nil, fmt.Errorf("workers: eventbus subscriber is nil")
	}
	if log == nil {
		log = zap.NewNop()
	}
	if deps.InvalidateRole == nil {
		deps.InvalidateRole = middleware.InvalidateRoleCache
	}

	var subs []eventbus.Subscription
	addSub := func(durable, subject string, handler eventbus.Handler) error {
		s, err := sub.Subscribe(ctx, durable, subject, handler)
		if err != nil {
			return fmt.Errorf("subscribe %s (%s): %w", durable, subject, err)
		}
		subs = append(subs, s)
		return nil
	}

	billing := NewBillingConsumer(deps, log)
	if err := addSub("billing-payment-approved", eventbus.SubjectPaymentApproved, billing.HandlePaymentApproved); err != nil {
		return subs, err
	}
	if err := addSub("billing-checkout-paid", eventbus.SubjectCheckoutPaid, billing.HandleCheckoutPaid); err != nil {
		return subs, err
	}
	if err := addSub("billing-checkout-failed", eventbus.SubjectCheckoutFailed, billing.HandleCheckoutFailed); err != nil {
		return subs, err
	}

	clerkSync := NewClerkSyncConsumer(deps, log)
	if err := addSub("clerk-metadata-sync", eventbus.SubjectClerkMetadataSyncRequest, clerkSync.Handle); err != nil {
		return subs, err
	}

	push := NewPushConsumer(deps, log)
	if err := addSub("notification-push", eventbus.SubjectNotificationRequested, push.Handle); err != nil {
		return subs, err
	}

	discord := NewDiscordConsumer(deps, log)
	if err := addSub("error-discord-notify", eventbus.SubjectErrorReported, discord.Handle); err != nil {
		return subs, err
	}

	garmin := NewGarminConsumer(deps, log)
	if err := addSub("wearable-garmin-sync", eventbus.SubjectGarminSyncRequested, garmin.Handle); err != nil {
		return subs, err
	}

	training := NewTrainingConsumer(deps, log)
	if err := addSub("training-workout-completed", eventbus.SubjectWorkoutCompleted, training.HandleWorkoutCompleted); err != nil {
		return subs, err
	}

	log.Info("domain workers registered", zap.Int("consumers", len(subs)))
	return subs, nil
}
