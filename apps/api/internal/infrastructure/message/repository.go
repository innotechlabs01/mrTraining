package message

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/message"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

type repository struct {
	db *sql.DB
}

// NewRepository creates a new message repository.
func NewRepository(db *sql.DB) domain.Repository {
	return &repository{db: db}
}

func (r *repository) GetThreads(ctx context.Context, userID string) ([]*domain.MessageThread, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, coach_id, athlete_id, athlete_name, subject, last_message, last_sent_at, unread_count, created_at, updated_at
		FROM message_threads
		WHERE coach_id = ? OR athlete_id = ?
		ORDER BY last_sent_at DESC
	`, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query threads: %w", err)
	}
	defer rows.Close()

	var threads []*domain.MessageThread
	for rows.Next() {
		t := &domain.MessageThread{}
		if err := rows.Scan(&t.ID, &t.CoachID, &t.AthleteID, &t.AthleteName, &t.Subject, &t.LastMessage, &t.LastSentAt, &t.UnreadCount, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan thread: %w", err)
		}
		threads = append(threads, t)
	}
	return threads, nil
}

func (r *repository) GetThread(ctx context.Context, threadID string) (*domain.MessageThread, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, coach_id, athlete_id, athlete_name, subject, last_message, last_sent_at, unread_count, created_at, updated_at
		FROM message_threads WHERE id = ?
	`, threadID)
	t := &domain.MessageThread{}
	err := row.Scan(&t.ID, &t.CoachID, &t.AthleteID, &t.AthleteName, &t.Subject, &t.LastMessage, &t.LastSentAt, &t.UnreadCount, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("MessageThread", threadID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get thread: %w", err)
	}
	return t, nil
}

func (r *repository) CreateThread(ctx context.Context, thread *domain.MessageThread) error {
	if thread.ID == "" {
		thread.ID = uuid.New().String()
	}
	now := time.Now().UTC().Format(time.RFC3339)
	thread.CreatedAt = now
	thread.UpdatedAt = now
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO message_threads (id, coach_id, athlete_id, athlete_name, subject, last_message, last_sent_at, unread_count, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, thread.ID, thread.CoachID, thread.AthleteID, thread.AthleteName, thread.Subject, thread.LastMessage, thread.LastSentAt, thread.UnreadCount, thread.CreatedAt, thread.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create thread: %w", err)
	}
	return nil
}

func (r *repository) GetMessages(ctx context.Context, threadID string) ([]*domain.Message, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, thread_id, sender_id, sender_role, content, is_read, created_at
		FROM messages WHERE thread_id = ? ORDER BY created_at ASC
	`, threadID)
	if err != nil {
		return nil, fmt.Errorf("failed to query messages: %w", err)
	}
	defer rows.Close()

	var msgs []*domain.Message
	for rows.Next() {
		m := &domain.Message{}
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.SenderID, &m.SenderRole, &m.Content, &m.IsRead, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *repository) SendMessage(ctx context.Context, msg *domain.Message) error {
	if msg.ID == "" {
		msg.ID = uuid.New().String()
	}
	now := time.Now().UTC().Format(time.RFC3339)
	msg.CreatedAt = now
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO messages (id, thread_id, sender_id, sender_role, content, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, msg.ID, msg.ThreadID, msg.SenderID, msg.SenderRole, msg.Content, msg.IsRead, msg.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert message: %w", err)
	}
	// Update thread's last_message and last_sent_at, increment unread for recipient
	_, err = r.db.ExecContext(ctx, `
		UPDATE message_threads
		SET last_message = ?, last_sent_at = ?, updated_at = ?,
			unread_count = unread_count + 1
		WHERE id = ?
	`, msg.Content, msg.CreatedAt, time.Now().UTC().Format(time.RFC3339), msg.ThreadID)
	return err
}

func (r *repository) MarkThreadRead(ctx context.Context, threadID, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE messages SET is_read = true WHERE thread_id = ? AND sender_id != ?
	`, threadID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark messages read: %w", err)
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE message_threads SET unread_count = 0 WHERE id = ?
	`, threadID)
	return err
}