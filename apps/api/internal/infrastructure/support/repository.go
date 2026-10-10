// Package support provides SQLite persistence for the support ticket domain.
package support

import (
	"context"
	"database/sql"
	"fmt"

	supportdomain "github.com/innotechlabs01/mr-training-api/internal/domain/support"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements supportdomain.Repository using SQLite/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new support ticket repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByCoach(ctx context.Context, coachID string, status *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	query := `SELECT id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at, resolved_at
		FROM support_tickets WHERE coach_id = ?`
	args := []interface{}{coachID}
	if status != nil {
		query += ` AND status = ?`
		args = append(args, *status)
	}
	query += ` ORDER BY last_message_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tickets by coach: %w", err)
	}
	defer rows.Close()

	tickets := []*supportdomain.SupportTicket{}
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list tickets by coach: %w", err)
	}
	return tickets, nil
}

func (r *Repository) ListByAthlete(ctx context.Context, athleteID string, status *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	query := `SELECT id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at, resolved_at
		FROM support_tickets WHERE athlete_id = ?`
	args := []interface{}{athleteID}
	if status != nil {
		query += ` AND status = ?`
		args = append(args, *status)
	}
	query += ` ORDER BY last_message_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tickets by athlete: %w", err)
	}
	defer rows.Close()

	tickets := []*supportdomain.SupportTicket{}
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list tickets by athlete: %w", err)
	}
	return tickets, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*supportdomain.SupportTicket, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at, resolved_at
		FROM support_tickets WHERE id = ?`, id)
	return scanTicketRow(row)
}

func (r *Repository) Create(ctx context.Context, t *supportdomain.SupportTicket) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO support_tickets (
		id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
		t.ID, t.TicketNumber, t.Subject, t.Category, t.Priority, t.Status, t.CoachID, t.AthleteID, t.AssignedTo, t.UnreadCount, t.LastMessageAt)
	if err != nil {
		return fmt.Errorf("create ticket: %w", err)
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, t *supportdomain.SupportTicket) error {
	result, err := r.db.ExecContext(ctx, `UPDATE support_tickets SET
		subject = ?, category = ?, priority = ?, status = ?, athlete_id = ?, assigned_to = ?, unread_count = ?, last_message_at = ?, updated_at = datetime('now'), resolved_at = ?
		WHERE id = ?`,
		t.Subject, t.Category, t.Priority, t.Status, t.AthleteID, t.AssignedTo, t.UnreadCount, t.LastMessageAt, nullString(t.ResolvedAt), t.ID)
	if err != nil {
		return fmt.Errorf("update ticket: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.NotFound("SupportTicket", t.ID)
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM support_tickets WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete ticket: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.NotFound("SupportTicket", id)
	}
	return nil
}

func (r *Repository) ListMessages(ctx context.Context, ticketID string) ([]*supportdomain.TicketMessage, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, ticket_id, author, author_id, body, image_url, read_at, created_at
		FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`, ticketID)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()

	msgs := []*supportdomain.TicketMessage{}
	for rows.Next() {
		m, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	return msgs, nil
}

func (r *Repository) GetMessageByID(ctx context.Context, id string) (*supportdomain.TicketMessage, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, ticket_id, author, author_id, body, image_url, read_at, created_at
		FROM ticket_messages WHERE id = ?`, id)
	return scanMessageRow(row)
}

func (r *Repository) CreateMessage(ctx context.Context, m *supportdomain.TicketMessage) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO ticket_messages (
		id, ticket_id, author, author_id, body, image_url, read_at, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
		m.ID, m.TicketID, m.Author, m.AuthorID, m.Body, m.ImageURL, nullString(m.ReadAt))
	if err != nil {
		return fmt.Errorf("create message: %w", err)
	}
	// Update ticket's last_message_at and unread_count
	_, err = r.db.ExecContext(ctx, `UPDATE support_tickets SET last_message_at = datetime('now'), unread_count = unread_count + 1, updated_at = datetime('now') WHERE id = ?`, m.TicketID)
	return err
}

func (r *Repository) MarkMessagesRead(ctx context.Context, ticketID, readerID string, author supportdomain.TicketAuthor) error {
	// Mark messages from the other party as read
	var otherAuthor supportdomain.TicketAuthor
	switch author {
	case supportdomain.TicketAuthorCoach:
		otherAuthor = supportdomain.TicketAuthorSupport
	case supportdomain.TicketAuthorSupport:
		otherAuthor = supportdomain.TicketAuthorCoach
	case supportdomain.TicketAuthorAthlete:
		otherAuthor = supportdomain.TicketAuthorSupport
	default:
		otherAuthor = supportdomain.TicketAuthorSupport
	}

	_, err := r.db.ExecContext(ctx, `UPDATE ticket_messages SET read_at = datetime('now') WHERE ticket_id = ? AND author = ? AND read_at IS NULL`, ticketID, otherAuthor)
	if err != nil {
		return fmt.Errorf("mark messages read: %w", err)
	}
	// Reset unread count
	_, err = r.db.ExecContext(ctx, `UPDATE support_tickets SET unread_count = 0, updated_at = datetime('now') WHERE id = ?`, ticketID)
	return err
}

func (r *Repository) GetUnreadCount(ctx context.Context, ticketID, readerID string, author supportdomain.TicketAuthor) (int, error) {
	var otherAuthor supportdomain.TicketAuthor
	switch author {
	case supportdomain.TicketAuthorCoach:
		otherAuthor = supportdomain.TicketAuthorSupport
	case supportdomain.TicketAuthorSupport:
		otherAuthor = supportdomain.TicketAuthorCoach
	case supportdomain.TicketAuthorAthlete:
		otherAuthor = supportdomain.TicketAuthorSupport
	default:
		otherAuthor = supportdomain.TicketAuthorSupport
	}

	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = ? AND author = ? AND read_at IS NULL`, ticketID, otherAuthor).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get unread count: %w", err)
	}
	return count, nil
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanTicket(s scannable) (*supportdomain.SupportTicket, error) {
	var (
		t           supportdomain.SupportTicket
		resolvedAt  sql.NullString
		athleteID   sql.NullString
		assignedTo  sql.NullString
	)
	err := s.Scan(&t.ID, &t.TicketNumber, &t.Subject, &t.Category, &t.Priority, &t.Status, &t.CoachID, &athleteID, &assignedTo, &t.UnreadCount, &t.LastMessageAt, &t.CreatedAt, &t.UpdatedAt, &resolvedAt)
	if err != nil {
		return nil, err
	}
	t.AthleteID = athleteID.String
	t.AssignedTo = assignedTo.String
	t.ResolvedAt = resolvedAt.String
	return &t, nil
}

func scanTicketRow(row *sql.Row) (*supportdomain.SupportTicket, error) {
	t, err := scanTicket(row)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("SupportTicket", "")
	}
	if err != nil {
		return nil, err
	}
	return t, nil
}

func scanMessage(s scannable) (*supportdomain.TicketMessage, error) {
	var (
		m        supportdomain.TicketMessage
		readAt   sql.NullString
		imageURL sql.NullString
	)
	err := s.Scan(&m.ID, &m.TicketID, &m.Author, &m.AuthorID, &m.Body, &imageURL, &readAt, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	m.ImageURL = imageURL.String
	m.ReadAt = readAt.String
	return &m, nil
}

func scanMessageRow(row *sql.Row) (*supportdomain.TicketMessage, error) {
	m, err := scanMessage(row)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("TicketMessage", "")
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}