package membership

import (
	"context"
	"sync"

	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
)

// InMemoryUserRepository implements user.Repository for testing
type InMemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]*user.User
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users: make(map[string]*user.User),
	}
}

func (r *InMemoryUserRepository) Create(ctx context.Context, u *user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.users[u.ID]; exists {
		return ErrUserAlreadyExists
	}
	r.users[u.ID] = u
	return nil
}

func (r *InMemoryUserRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[id]
	if !ok {
		return nil, ErrUserNotFound
	}
	return u, nil
}

func (r *InMemoryUserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, ErrUserNotFound
}

func (r *InMemoryUserRepository) Update(ctx context.Context, u *user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[u.ID]; !ok {
		return ErrUserNotFound
	}
	r.users[u.ID] = u
	return nil
}

func (r *InMemoryUserRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[id]; !ok {
		return ErrUserNotFound
	}
	delete(r.users, id)
	return nil
}

func (r *InMemoryUserRepository) List(ctx context.Context) ([]*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	users := make([]*user.User, 0, len(r.users))
	for _, u := range r.users {
		users = append(users, u)
	}
	return users, nil
}

// InMemoryMembershipRepository implements membership.Repository for testing
type InMemoryMembershipRepository struct {
	mu           sync.RWMutex
	memberships  map[string]*membership.Membership
	byAthleteID  map[string]string
	byCoachID    map[string][]string
}

func NewInMemoryMembershipRepository() *InMemoryMembershipRepository {
	return &InMemoryMembershipRepository{
		memberships: make(map[string]*membership.Membership),
		byAthleteID: make(map[string]string),
		byCoachID:   make(map[string][]string),
	}
}

func (r *InMemoryMembershipRepository) Create(ctx context.Context, m *membership.Membership) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.memberships[m.ID]; exists {
		return ErrMembershipAlreadyExists
	}
	r.memberships[m.ID] = m
	r.byAthleteID[m.AthleteID] = m.ID
	r.byCoachID[m.CoachID] = append(r.byCoachID[m.CoachID], m.ID)
	return nil
}

func (r *InMemoryMembershipRepository) GetByID(ctx context.Context, id string) (*membership.Membership, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	m, ok := r.memberships[id]
	if !ok {
		return nil, ErrMembershipNotFound
	}
	return m, nil
}

func (r *InMemoryMembershipRepository) GetByAthleteID(ctx context.Context, athleteID string) (*membership.Membership, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id, ok := r.byAthleteID[athleteID]
	if !ok {
		return nil, ErrMembershipNotFound
	}
	m, ok := r.memberships[id]
	if !ok {
		return nil, ErrMembershipNotFound
	}
	return m, nil
}

func (r *InMemoryMembershipRepository) Update(ctx context.Context, m *membership.Membership) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.memberships[m.ID]; !ok {
		return ErrMembershipNotFound
	}
	r.memberships[m.ID] = m
	return nil
}

func (r *InMemoryMembershipRepository) ListByCoach(ctx context.Context, coachID string) ([]*membership.Membership, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ids, ok := r.byCoachID[coachID]
	if !ok {
		return []*membership.Membership{}, nil
	}
	result := make([]*membership.Membership, 0, len(ids))
	for _, id := range ids {
		if m, ok := r.memberships[id]; ok {
			result = append(result, m)
		}
	}
	return result, nil
}

func (r *InMemoryMembershipRepository) GetPaymentHistory(ctx context.Context, athleteID string) ([]*membership.Payment, error) {
	return []*membership.Payment{}, nil
}

func (r *InMemoryMembershipRepository) RecordPayment(ctx context.Context, p *membership.Payment) error {
	return nil
}

func (r *InMemoryMembershipRepository) Cancel(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.memberships[id]; !ok {
		return ErrMembershipNotFound
	}
	delete(r.memberships, id)
	return nil
}

// Error definitions for in-memory repositories
var (
	ErrUserAlreadyExists       = &testError{msg: "user already exists"}
	ErrUserNotFound            = &testError{msg: "user not found"}
	ErrMembershipAlreadyExists = &testError{msg: "membership already exists"}
	ErrMembershipNotFound      = &testError{msg: "membership not found"}
)

type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}