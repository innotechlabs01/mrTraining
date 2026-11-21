package middleware

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
)

const (
	// IdempotencyKeyHeader is the standard header enabling transactional HTTP idempotency.
	IdempotencyKeyHeader = "Idempotency-Key"
	// IdempotencyReplayHeader marks responses served from stored idempotency cache.
	IdempotencyReplayHeader = "X-Idempotency-Replayed"
)

// Idempotency enforces request deduplication for critical mutating HTTP endpoints
// when callers supply an Idempotency-Key header. Legacy requests without the header
// pass straight through untouched.
func Idempotency(db *sql.DB, ttl ...time.Duration) fiber.Handler {
	expiry := 24 * time.Hour
	if len(ttl) > 0 && ttl[0] > 0 {
		expiry = ttl[0]
	}

	return func(c *fiber.Ctx) error {
		if db == nil {
			return c.Next()
		}
		key := strings.TrimSpace(c.Get(IdempotencyKeyHeader))
		if key == "" {
			return c.Next()
		}
		if len(key) > 128 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "INVALID_IDEMPOTENCY_KEY",
					"message": "Idempotency-Key header exceeds 128 characters",
				},
			})
		}

		actorID := GetUserID(c)
		if actorID == "" {
			actorID = c.IP()
		}
		scope := c.Method() + ":" + c.Path()
		reqHash := computeRequestHash(c.Method(), c.Path(), c.Body())
		ctx := RequestContext(c)

		state, err := claimIdempotencyKey(ctx, db, scope, key, actorID, reqHash, expiry)
		if err != nil {
			// Fail open on unexpected store infra failure while logging metrics?
			// Actually return next so temporary contention doesn't block all traffic, OR surface 409/mismatch.
			metrics.IdempotencyHitsTotal.Inc("store_error")
			return c.Next()
		}

		switch state.action {
		case idempReplay:
			metrics.IdempotencyHitsTotal.Inc("replay")
			if state.contentType != "" {
				c.Set(fiber.HeaderContentType, state.contentType)
			}
			c.Set(IdempotencyReplayHeader, "true")
			return c.Status(state.statusCode).Send(state.body)

		case idempHashMismatch:
			metrics.IdempotencyHitsTotal.Inc("mismatch")
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "IDEMPOTENCY_KEY_REUSE_MISMATCH",
					"message": "Idempotency-Key reused with a different request payload",
				},
			})

		case idempInProgress:
			metrics.IdempotencyHitsTotal.Inc("in_progress")
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "REQUEST_IN_PROGRESS",
					"message": "An identical request with this Idempotency-Key is already in progress",
				},
			})
		}

		metrics.IdempotencyHitsTotal.Inc("miss")
		err = c.Next()

		status := c.Response().StatusCode()
		if err != nil {
			if fe, ok := err.(*fiber.Error); ok {
				status = fe.Code
			} else if status < 400 {
				status = http.StatusInternalServerError
			}
		}

		// 5xx or handler error: release lock so safe client retries can execute cleanly.
		if err != nil || status >= http.StatusInternalServerError {
			_ = releaseIdempotencyKey(ctx, db, scope, key, actorID)
			return err
		}

		ct := string(c.Response().Header.ContentType())
		respBody := append([]byte(nil), c.Response().Body()...)
		_ = completeIdempotencyKey(ctx, db, scope, key, actorID, status, respBody, ct, expiry)
		return nil
	}
}

type idempAction uint8

const (
	idempProceed idempAction = iota
	idempReplay
	idempHashMismatch
	idempInProgress
)

type idempClaimResult struct {
	action      idempAction
	statusCode  int
	contentType string
	body        []byte
}

func computeRequestHash(method, path string, body []byte) string {
	h := sha256.New()
	_, _ = h.Write([]byte(method))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(path))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write(body)
	return hex.EncodeToString(h.Sum(nil))
}

func claimIdempotencyKey(ctx interface{ Done() <-chan struct{} }, db *sql.DB, scope, key, actorID, reqHash string, expiry time.Duration) (idempClaimResult, error) {
	tx, err := db.Begin()
	if err != nil {
		return idempClaimResult{}, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`SELECT set_config('app.internal_execution_context', 'system_worker', true)`); err != nil {
		return idempClaimResult{}, err
	}

	expiresAt := time.Now().UTC().Add(expiry)
	lockedUntil := time.Now().UTC().Add(30 * time.Second)
	_, err = tx.Exec(`
		INSERT INTO idempotency_keys (scope, key, actor_id, request_hash, status, locked_until, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, NOW(), NOW())
	`, scope, key, actorID, reqHash, lockedUntil, expiresAt)
	if err == nil {
		if cerr := tx.Commit(); cerr != nil {
			return idempClaimResult{}, cerr
		}
		return idempClaimResult{action: idempProceed}, nil
	}

	// If not unique violation, bail out; if unique violation (or mock conflict), inspect existing row.
	_ = tx.Rollback()
	if isUniqueErr(err) || strings.Contains(strings.ToLower(err.Error()), "unique") || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
		return inspectExistingIdempotencyKey(db, scope, key, actorID, reqHash, lockedUntil, expiresAt)
	}
	return idempClaimResult{}, err
}

func inspectExistingIdempotencyKey(db *sql.DB, scope, key, actorID, reqHash string, lockedUntil, expiresAt time.Time) (idempClaimResult, error) {
	tx, err := db.Begin()
	if err != nil {
		return idempClaimResult{}, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`SELECT set_config('app.internal_execution_context', 'system_worker', true)`); err != nil {
		return idempClaimResult{}, err
	}

	var storedHash, status string
	var code sql.NullInt64
	var body []byte
	var ct sql.NullString
	var storedLocked, storedExpires time.Time

	err = tx.QueryRow(`
		SELECT request_hash, status, response_code, response_body, content_type, locked_until, expires_at
		FROM idempotency_keys
		WHERE scope = $1 AND key = $2 AND actor_id = $3
		FOR UPDATE
	`, scope, key, actorID).Scan(&storedHash, &status, &code, &body, &ct, &storedLocked, &storedExpires)
	if err != nil {
		return idempClaimResult{}, err
	}

	now := time.Now().UTC()
	if now.After(storedExpires) {
		_, uerr := tx.Exec(`
			UPDATE idempotency_keys
			SET request_hash = $1, status = 'in_progress', response_code = NULL, response_body = NULL,
			    content_type = NULL, locked_until = $2, expires_at = $3, updated_at = NOW()
			WHERE scope = $4 AND key = $5 AND actor_id = $6
		`, reqHash, lockedUntil, expiresAt, scope, key, actorID)
		if uerr != nil {
			return idempClaimResult{}, uerr
		}
		if cerr := tx.Commit(); cerr != nil {
			return idempClaimResult{}, cerr
		}
		return idempClaimResult{action: idempProceed}, nil
	}

	if storedHash != reqHash {
		_ = tx.Commit()
		return idempClaimResult{action: idempHashMismatch}, nil
	}
	if status == "completed" && code.Valid {
		_ = tx.Commit()
		return idempClaimResult{
			action:      idempReplay,
			statusCode:  int(code.Int64),
			contentType: ct.String,
			body:        body,
		}, nil
	}
	if status == "in_progress" && now.Before(storedLocked) {
		_ = tx.Commit()
		return idempClaimResult{action: idempInProgress}, nil
	}

	// Expired lock on unfinished request -> reclaim
	_, uerr := tx.Exec(`
		UPDATE idempotency_keys
		SET locked_until = $1, updated_at = NOW()
		WHERE scope = $2 AND key = $3 AND actor_id = $4
	`, lockedUntil, scope, key, actorID)
	if uerr != nil {
		return idempClaimResult{}, uerr
	}
	if cerr := tx.Commit(); cerr != nil {
		return idempClaimResult{}, cerr
	}
	return idempClaimResult{action: idempProceed}, nil
}

func completeIdempotencyKey(_ interface{ Done() <-chan struct{} }, db *sql.DB, scope, key, actorID string, status int, body []byte, contentType string, expiry time.Duration) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`SELECT set_config('app.internal_execution_context', 'system_worker', true)`); err != nil {
		return err
	}
	expiresAt := time.Now().UTC().Add(expiry)
	if _, err := tx.Exec(`
		UPDATE idempotency_keys
		SET status = 'completed', response_code = $1, response_body = $2, content_type = $3,
		    expires_at = $4, updated_at = NOW()
		WHERE scope = $5 AND key = $6 AND actor_id = $7
	`, status, body, contentType, expiresAt, scope, key, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

func releaseIdempotencyKey(_ interface{ Done() <-chan struct{} }, db *sql.DB, scope, key, actorID string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`SELECT set_config('app.internal_execution_context', 'system_worker', true)`); err != nil {
		return err
	}
	_, _ = tx.Exec(`DELETE FROM idempotency_keys WHERE scope = $1 AND key = $2 AND actor_id = $3 AND status = 'in_progress'`, scope, key, actorID)
	return tx.Commit()
}

func isUniqueErr(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	return strings.Contains(err.Error(), "23505")
}
