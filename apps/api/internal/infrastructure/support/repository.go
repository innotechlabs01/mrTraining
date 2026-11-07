// Package support provides SQLite persistence for the support ticket domain.
package support

import (
	"context"
	"database/sql"
	"fmt"

	supportdomain "github.com/innotechlabs01/mr-training-api/internal/domain/support"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements supportdomain.Repository using SQLite/libsql.
type Repository struct {
	db  *sql.DB
	exec database.Executor
}

// NewRepository creates a new support ticket repository.
// By default, all queries run against the connection pool. Use SetExecutor to
// inject a *sql.Tx for transactional operations within a UnitOfWork.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) supportdomain.Repository {
	return &Repository{
		db:  r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

func (r *Repository) ListByCoach(ctx context.Context, coachID string, status *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	query := `SELECT id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at, resolved_at
		FROM support_tickets WHERE coach_id = $1`
	args := []interface{}{coachID}
	if status != nil {
		query += ` AND status = $2`
		args = append(args, *status)
	}
	query += ` ORDER BY last_message_at DESC`

	rows, err := r.exec.QueryContext(ctx, query, args...)
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
		FROM support_tickets WHERE athlete_id = $1`
	args := []interface{}{athleteID}
	if status != nil {
		query += ` AND status = $4`
		args = append(args, *status)
	}
	query += ` ORDER BY last_message_at DESC`

	rows, err := r.exec.QueryContext(ctx, query, args...)
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
	row := r.exec.QueryRowContext(ctx, `SELECT id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at, resolved_at
		FROM support_tickets WHERE id = $1`, id)
	return scanTicketRow(row)
}

func (r *Repository) Create(ctx context.Context, t *supportdomain.SupportTicket) error {
	_, err := r.exec.ExecContext(ctx, `INSERT INTO support_tickets (
		id, ticket_number, subject, category, priority, status, coach_id, athlete_id, assigned_to, unread_count, last_message_at, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
		t.ID, t.TicketNumber, t.Subject, t.Category, t.Priority, t.Status, t.CoachID, t.AthleteID, t.AssignedTo, t.UnreadCount, t.LastMessageAt)
	if err != nil {
		return fmt.Errorf("create ticket: %w", err)
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, t *supportdomain.SupportTicket) error {
	result, err := r.exec.ExecContext(ctx, `UPDATE support_tickets SET
		subject = $1, category = $2, priority = $3, status = $4, athlete_id = $5, assigned_to = $6, unread_count = $7, last_message_at = $8, updated_at = NOW(), resolved_at = $9
		WHERE id = $10`,
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
	result, err := r.exec.ExecContext(ctx, `DELETE FROM support_tickets WHERE id = $1`, id)
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
	rows, err := r.exec.QueryContext(ctx, `SELECT id, ticket_id, author, author_id, body, image_url, read_at, created_at
		FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`, ticketID)
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
	row := r.exec.QueryRowContext(ctx, `SELECT id, ticket_id, author, author_id, body, image_url, read_at, created_at
		FROM ticket_messages WHERE id = $1`, id)
	return scanMessageRow(row)
}

func (r *Repository) CreateMessage(ctx context.Context, m *supportdomain.TicketMessage) error {
	_, err := r.exec.ExecContext(ctx, `INSERT INTO ticket_messages (
		id, ticket_id, author, author_id, body, image_url, read_at, created_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		m.ID, m.TicketID, m.Author, m.AuthorID, m.Body, m.ImageURL, nullString(m.ReadAt))
	if err != nil {
		return fmt.Errorf("create message: %w", err)
	}
	// Update ticket's last_message_at and unread_count
	_, err = r.exec.ExecContext(ctx, `UPDATE support_tickets SET last_message_at = NOW(), unread_count = unread_count + 1, updated_at = NOW() WHERE id = $1`, m.TicketID)
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

	_, err := r.exec.ExecContext(ctx, `UPDATE ticket_messages SET read_at = NOW() WHERE ticket_id = $1 AND author = $2 AND read_at IS NULL`, ticketID, otherAuthor)
	if err != nil {
		return fmt.Errorf("mark messages read: %w", err)
	}
	// Reset unread count
	_, err = r.exec.ExecContext(ctx, `UPDATE support_tickets SET unread_count = 0, updated_at = NOW() WHERE id = $1`, ticketID)
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
	err := r.exec.QueryRowContext(ctx, `SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = $1 AND author = $2 AND read_at IS NULL`, ticketID, otherAuthor).Scan(&count)
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