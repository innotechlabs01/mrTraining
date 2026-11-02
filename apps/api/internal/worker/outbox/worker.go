// Package outbox implements the durable Outbox polling worker for Fase 1.
//
// El worker reclama eventos pendientes con claimToken + FOR UPDATE SKIP LOCKED,
// de modo que varios workers nunca procesen el mismo evento al mismo tiempo.
// Cada evento se publica una sola vez (idempotencia por event_id en el
// consumidor) y pasa por los estados pending -> processing -> published
// (terminal) o dead (terminal tras agotar reintentos). Los fallos se
// reintentan con backoff exponencial programado en next_retry_at.
package outbox

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// Evento del Outbox listo para ser publicado por el worker.
type Event struct {
	ID            string
	EventID       string
	EventType     string
	AggregateType string
	AggregateID   string
	CoachID       string
	AthleteID     string
	Payload       []byte
	OccurredAt    time.Time
	Status        string
	Attempts      int
	NextRetryAt   time.Time
	LastError     string
}

// Publisher envía un evento del Outbox hacia abajo (p. ej. SSE o NATS). El
// consumidor es responsable de la deduplicación por event_id para lograr
// exactamente-una-publicación.
type Publisher interface {
	Publish(ctx context.Context, e Event) error
}

// Option configura el Worker.
type Option func(*Worker)

// WithPollInterval establece el tiempo de espera entre ciclos de sondeo.
func WithPollInterval(d time.Duration) Option {
	return func(w *Worker) { w.pollInterval = d }
}

// WithMaxAttempts establece el número máximo de reintentos antes de marcar
// el evento como dead.
func WithMaxAttempts(n int) Option {
	return func(w *Worker) { w.maxAttempts = n }
}

// WithLeaseTTL establece la duración del lease (claimToken) sobre un evento.
func WithLeaseTTL(d time.Duration) Option {
	return func(w *Worker) { w.leaseTTL = d }
}

// WithBaseBackoff establece el backoff base para el cálculo exponencial
// (next_retry_at = now() + baseBackoff * 2^attempts).
func WithBaseBackoff(d time.Duration) Option {
	return func(w *Worker) { w.baseBackoff = d }
}

// WithLogger asigna un logger. Si no se proporciona, se usa un nop.
func WithLogger(logger *zap.Logger) Option {
	return func(w *Worker) { w.logger = logger }
}

// Worker consulta la tabla outbox en bucle, reclama el próximo evento listo
// para publicar, lo publica y gestiona reintentos / estado dead.
type Worker struct {
	db           *sql.DB
	claimToken   string
	publisher    Publisher
	pollInterval time.Duration
	maxAttempts  int
	leaseTTL     time.Duration
	baseBackoff  time.Duration
	logger       *zap.Logger
}

const (
	defaultPollInterval = 5 * time.Second
	defaultMaxAttempts  = 10
	defaultLeaseTTL     = 5 * time.Minute
	defaultBaseBackoff  = 1 * time.Second

	// Estados del Outbox.
	statusPending    = "pending"
	statusProcessing = "processing"
	statusPublished  = "published"
	statusDead       = "dead"
)

// NewWorker construye un Worker con valores por defecto sobrescribibles vía Option.
func NewWorker(db *sql.DB, claimToken string, publisher Publisher, opts ...Option) *Worker {
	w := &Worker{
		db:           db,
		claimToken:   claimToken,
		publisher:    publisher,
		pollInterval: defaultPollInterval,
		maxAttempts:  defaultMaxAttempts,
		leaseTTL:     defaultLeaseTTL,
		baseBackoff:  defaultBaseBackoff,
		logger:       zap.NewNop(),
	}
	for _, opt := range opts {
		opt(w)
	}
	return w
}

// Run ejecuta el bucle del worker hasta que ctx se cancele.
// Devuelve nil al cierre ordenado, o el error del contexto al cancelarse.
func (w *Worker) Run(ctx context.Context) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		event, err := w.claimNext(ctx)
		if err != nil {
			w.logger.Error("claim failed", zap.Error(err))
			w.sleep(ctx)
			continue
		}
		if event == nil {
			// No hay eventos listos: esperar el próximo ciclo.
			w.sleep(ctx)
			continue
		}

		if err := w.process(ctx, event); err != nil {
			w.logger.Error("process failed",
				zap.String("event_id", event.EventID),
				zap.Error(err))
		}
	}
}

// sleep espera pollInterval respetando la cancelación del contexto.
func (w *Worker) sleep(ctx context.Context) {
	timer := time.NewTimer(w.pollInterval)
	select {
	case <-ctx.Done():
		timer.Stop()
	case <-timer.C:
	}
}

// claimNext reclama el próximo evento listo para publicar.
// Usa FOR UPDATE SKIP LOCKED para que varios workers nunca reclamen la misma
// fila. También recupera leases caducos (processing con locked_until pasado).
func (w *Worker) claimNext(ctx context.Context) (*Event, error) {
	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() // no-op después de Commit

	const q = `
		SELECT id, event_id, event_type, aggregate_type, aggregate_id,
		       coach_id, athlete_id, payload, occurred_at, status,
		       attempts, next_retry_at, last_error
		FROM outbox
		WHERE (status = $1 AND next_retry_at <= NOW())
		   OR (status = $2 AND locked_until < NOW())
		ORDER BY next_retry_at
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	`
	row := tx.QueryRowContext(ctx, q, statusPending, statusProcessing)

	e := &Event{}
	var payload []byte
	var lockedUntil sql.NullTime
	var nextRetryAt sql.NullTime
	var occurredAt sql.NullTime
	if err := row.Scan(
		&e.ID, &e.EventID, &e.EventType, &e.AggregateType, &e.AggregateID,
		&e.CoachID, &e.AthleteID, &payload, &occurredAt, &e.Status,
		&e.Attempts, &nextRetryAt, &e.LastError,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // nada que reclamar
		}
		return nil, fmt.Errorf("scan claimed event: %w", err)
	}
	e.Payload = payload
	if occurredAt.Valid {
		e.OccurredAt = occurredAt.Time
	}
	if nextRetryAt.Valid {
		e.NextRetryAt = nextRetryAt.Time
	}

	// Establece el lease (claimToken) y pasa el evento a processing.
	const leaseQ = `
		UPDATE outbox
		SET status = $1, locked_by = $2, locked_until = $3
		WHERE id = $4 AND status IN ($5, $6)
	`
	now := time.Now()
	lockedUntil = sql.NullTime{Time: now.Add(w.leaseTTL), Valid: true}
	if _, err := tx.ExecContext(ctx, leaseQ, statusProcessing, w.claimToken, lockedUntil, e.ID, statusPending, statusProcessing); err != nil {
		return nil, fmt.Errorf("set lease: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit claim: %w", err)
	}

	return e, nil
}

// process publica un evento y gestiona el resultado: published en éxito,
// dead si se agotaron los reintentos, o reprogramación con backoff exponencial.
func (w *Worker) process(ctx context.Context, e *Event) error {
	if err := w.publisher.Publish(ctx, *e); err != nil {
		return w.fail(ctx, e.ID, e.Attempts+1, err)
	}
	return w.markPublished(ctx, e.ID)
}

// fail registra un fallo de publicación. Si se alcanzó maxAttempts, el evento
// pasa a dead; de lo contrario se reprograma con backoff exponencial.
func (w *Worker) fail(ctx context.Context, id string, attempts int, lastError error) error {
	if attempts >= w.maxAttempts {
		return w.markDead(ctx, id, attempts, lastError.Error())
	}
	nextRetryAt := time.Now().Add(w.backoff(attempts))
	const q = `
		UPDATE outbox
		SET status = $1, attempts = $2, next_retry_at = $3,
		    last_error = $4, locked_by = NULL, locked_until = NULL
		WHERE id = $5
	`
	_, err := w.db.ExecContext(ctx, q, statusPending, attempts, nextRetryAt, lastError.Error(), id)
	if err != nil {
		return fmt.Errorf("retry reschedule: %w", err)
	}
	w.logger.Warn("publication failed, rescheduled",
		zap.String("outbox_id", id),
		zap.Int("attempts", attempts),
		zap.String("next_retry_at", nextRetryAt.String()),
		zap.Error(lastError))
	return nil
}

// backoff calcula el tiempo de espera exponencial para el intento dado.
func (w *Worker) backoff(attempts int) time.Duration {
	return w.baseBackoff * time.Duration(1<<uint(attempts-1))
}

// markPublished marca el evento como publicado (terminal).
func (w *Worker) markPublished(ctx context.Context, id string) error {
	const q = `
		UPDATE outbox
		SET status = $1, published_at = NOW(), locked_by = NULL, locked_until = NULL
		WHERE id = $2
	`
	_, err := w.db.ExecContext(ctx, q, statusPublished, id)
	if err != nil {
		return fmt.Errorf("mark published: %w", err)
	}
	return nil
}

// markDead marca el evento como dead (terminal, sin más reintentos).
func (w *Worker) markDead(ctx context.Context, id string, attempts int, lastError string) error {
	const q = `
		UPDATE outbox
		SET status = $1, attempts = $2, last_error = $3,
		    locked_by = NULL, locked_until = NULL
		WHERE id = $4
	`
	_, err := w.db.ExecContext(ctx, q, statusDead, attempts, lastError, id)
	if err != nil {
		return fmt.Errorf("mark dead: %w", err)
	}
	w.logger.Warn("event marked dead",
		zap.String("outbox_id", id),
		zap.Int("attempts", attempts),
		zap.String("last_error", lastError))
	return nil
}
