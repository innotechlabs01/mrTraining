//go:build ignore

package message

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

// Repository implements message.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new message repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetThreads retrieves all message threads for a user.
func (r *Repository) GetThreads(ctx context.Context, userID string) ([]*MessageThread, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, coach_id, athlete_id, athlete_name, subject, last_message, last_sent_at, unread_count, created_at, updated_at
		 FROM message_threads
		 WHERE coach_id = ? OR athlete_id = ?
		 ORDER BY updated_at DESC`, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get message threads: %w", err)
	}
	defer rows.Close()

	var threads []*MessageThread
	for rows.Next() {
		t := &MessageThread{}
		var athleteName, subject, lastMessage, lastSentAt sql.NullString
		if err := rows.Scan(&t.ID, &t.CoachID, &t.AthleteID, &athleteName, &subject,
			&lastMessage, &lastSentAt, &t.UnreadCount, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan message thread: %w", err)
		}
		if athleteName.Valid {
			t.AthleteName = athleteName.String
		}
		if subject.Valid {
			t.Subject = subject.String
		}
		if lastMessage.Valid {
			t.LastMessage = lastMessage.String
		}
		if lastSentAt.Valid {
			t.LastSentAt = lastSentAt.String
		}
		threads = append(threads, t)
	}
	return threads, nil
}

// GetThread retrieves a single thread by ID.
func (r *Repository) GetThread(ctx context.Context, threadID string) (*MessageThread, error) {
	t := &MessageThread{}
	var athleteName, subject, lastMessage, lastSentAt sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, coach_id, athlete_id, athlete_name, subject, last_message, last_sent_at, unread_count, created_at, updated_at
		 FROM message_threads WHERE id = ?`, threadID).Scan(
		&t.ID, &t.CoachID, &t.AthleteID, &athleteName, &subject,
		&lastMessage, &lastSentAt, &t.UnreadCount, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("thread not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get message thread: %w", err)
	}
	if athleteName.Valid {
		t.AthleteName = athleteName.String
	}
	if subject.Valid {
		t.Subject = subject.String
	}
	if lastMessage.Valid {
		t.LastMessage = lastMessage.String
	}
	if lastSentAt.Valid {
		t.LastSentAt = lastSentAt.String
	}
	return t, nil
}

// CreateThread creates a new message thread.
func (r *Repository) CreateThread(ctx context.Context, t *MessageThread) error {
	t.ID = uuid.New().String()

	var athleteName, subject sql.NullString
	if t.AthleteName != "" {
		athleteName = sql.NullString{String: t.AthleteName, Valid: true}
	}
	if t.Subject != "" {
		subject = sql.NullString{String: t.Subject, Valid: true}
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO message_threads (id, coach_id, athlete_id, athlete_name, subject)
		 VALUES (?, ?, ?, ?, ?)`,
		t.ID, t.CoachID, t.AthleteID, athleteName, subject)
	if err != nil {
		return fmt.Errorf("failed to create message thread: %w", err)
	}
	return nil
}

// GetMessages retrieves all messages in a thread.
func (r *Repository) GetMessages(ctx context.Context, threadID string) ([]*Message, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, thread_id, sender_id, sender_role, content, is_read, created_at
		 FROM messages WHERE thread_id = ?
		 ORDER BY created_at ASC`, threadID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	defer rows.Close()

	var messages []*Message
	for rows.Next() {
		m := &Message{}
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.SenderID, &m.SenderRole,
			&m.Content, &m.IsRead, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, m)
	}
	return messages, nil
}

// SendMessage adds a message to a thread and updates the thread's last message.
func (r *Repository) SendMessage(ctx context.Context, m *Message) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	m.ID = uuid.New().String()

	_, err = tx.ExecContext(ctx,
		`INSERT INTO messages (id, thread_id, sender_id, sender_role, content, is_read)
		 VALUES (?, ?, ?, ?, ?, 0)`,
		m.ID, m.ThreadID, m.SenderID, m.SenderRole, m.Content)
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}

	// Update thread's last message
	_, err = tx.ExecContext(ctx,
		`UPDATE message_threads
		 SET last_message = ?, last_sent_at = datetime('now'), updated_at = datetime('now')
		 WHERE id = ?`, m.Content, m.ThreadID)
	if err != nil {
		return fmt.Errorf("failed to update thread: %w", err)
	}

	return tx.Commit()
}

// MarkThreadRead marks all messages in a thread as read for a user.
func (r *Repository) MarkThreadRead(ctx context.Context, threadID, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE messages SET is_read = 1
		 WHERE thread_id = ? AND sender_id != ?`, threadID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark thread read: %w", err)
	}

	// Reset unread count
	_, err = r.db.ExecContext(ctx,
		`UPDATE message_threads SET unread_count = 0 WHERE id = ?`, threadID)
	if err != nil {
		return fmt.Errorf("failed to reset unread count: %w", err)
	}

	return nil
}
