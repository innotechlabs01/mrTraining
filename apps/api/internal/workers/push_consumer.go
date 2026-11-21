package workers

import (
	"context"
	"strings"

	"go.uber.org/zap"

	notifdomain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

// PushConsumer delivers notification.requested events via Expo/FCM asynchronously
// and deactivates tokens reported as DeviceNotRegistered.
type PushConsumer struct {
	deps WorkerDeps
	log  *zap.Logger
}

// NewPushConsumer builds a PushConsumer.
func NewPushConsumer(deps WorkerDeps, log *zap.Logger) *PushConsumer {
	if log == nil {
		log = zap.NewNop()
	}
	return &PushConsumer{deps: deps, log: log}
}

// Handle dispatches push notifications for a single notification.requested event.
func (c *PushConsumer) Handle(ctx context.Context, ev eventbus.DomainEvent) error {
	if c.deps.Devices == nil || (c.deps.ExpoPush == nil && c.deps.FCMPush == nil) {
		return nil
	}

	userID := strField(ev.Payload, "user_id", ev.AthleteID)
	if userID == "" {
		userID = ev.AggregateID
	}
	title := strField(ev.Payload, "title", "")
	body := strField(ev.Payload, "message", strField(ev.Payload, "body", ""))
	notifID := strField(ev.Payload, "notification_id", ev.AggregateID)
	notifType := strField(ev.Payload, "type", "general")
	if userID == "" || title == "" {
		return nil
	}

	repo := c.deps.Devices
	var txDone func()
	if c.deps.DB != nil {
		if withExec, ok := repo.(interface {
			WithExecutor(database.Executor) notifdomain.Repository
		}); ok {
			tx, txErr := c.deps.DB.BeginTx(ctx, nil)
			if txErr == nil {
				if _, setErr := tx.ExecContext(ctx, `SELECT set_config('app.current_user_id', $1, true)`, userID); setErr == nil {
					_, _ = tx.ExecContext(ctx, `SELECT set_config('app.internal_execution_context', 'system_worker', true)`)
					repo = withExec.WithExecutor(tx)
					txDone = func() { _ = tx.Commit() }
					defer tx.Rollback()
				} else {
					_ = tx.Rollback()
				}
			}
		}
	}

	devices, err := repo.ListDevicesByUser(ctx, userID)
	if err != nil {
		return err
	}
	if len(devices) == 0 {
		if txDone != nil {
			txDone()
		}
		return nil
	}

	data := map[string]string{
		"notification_id": notifID,
		"type":            notifType,
	}

	var expoTokens []string
	var fcmTokens []string
	tokenToDeviceID := make(map[string]string, len(devices))
	for _, d := range devices {
		if d == nil || d.Token == "" {
			continue
		}
		tokenToDeviceID[d.Token] = d.ID
		if strings.HasPrefix(d.Token, "ExponentPushToken[") || strings.HasPrefix(d.Token, "ExpoPushToken[") || c.deps.FCMPush == nil {
			expoTokens = append(expoTokens, d.Token)
		} else {
			fcmTokens = append(fcmTokens, d.Token)
		}
	}

	if len(expoTokens) > 0 && c.deps.ExpoPush != nil {
		results, err := c.deps.ExpoPush.SendToMultipleWithReport(ctx, expoTokens, title, body, data)
		if err != nil {
			return err
		}
		for _, res := range results {
			if res.Error == "DeviceNotRegistered" {
				if devID, ok := tokenToDeviceID[res.Token]; ok {
					_ = repo.DeactivateDevice(ctx, devID)
					c.log.Info("deactivated unregistered Expo push device",
						zap.String("user_id", userID),
						zap.String("device_id", devID))
				}
			}
		}
	}

	if len(fcmTokens) > 0 && c.deps.FCMPush != nil {
		if err := c.deps.FCMPush.SendToMultiple(ctx, fcmTokens, title, body, data); err != nil {
			return err
		}
	}

	if txDone != nil {
		txDone()
	}
	return nil
}
