package database

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestUnitOfWork_Begin_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	// Expect connection acquisition
	mock.ExpectBegin()

	// Set RLS context - separate calls for each set_config
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	if err != nil {
		t.Errorf("Begin() error = %v", err)
	}

	if !uow.IsActive() {
		t.Error("UnitOfWork should be active after Begin()")
	}

	if uow.UserID() != "user_123" {
		t.Errorf("UserID() = %v, want user_123", uow.UserID())
	}

	if uow.CoachID() != "org_abc" {
		t.Errorf("CoachID() = %v, want org_abc", uow.CoachID())
	}

	if uow.Role() != "coach_owner" {
		t.Errorf("Role() = %v, want coach_owner", uow.Role())
	}

	if uow.Tx() == nil {
		t.Error("Tx() should return non-nil transaction")
	}

	if uow.Conn() == nil {
		t.Error("Conn() should return non-nil connection")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_Begin_EmptyUserID(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "", "org_abc", "coach_owner")
	if err == nil {
		t.Error("Begin() should fail with empty user_id")
	}
}

func TestUnitOfWork_Begin_EmptyOrgID(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "", "coach_owner")
	if err == nil {
		t.Error("Begin() should fail with empty coach_id")
	}
}

func TestUnitOfWork_Begin_EmptyRole(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "")
	if err == nil {
		t.Error("Begin() should fail with empty role")
	}
}

func TestUnitOfWork_Begin_Twice(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	if err != nil {
		t.Fatalf("First Begin() failed: %v", err)
	}

	// Second Begin should fail
	err = uow.Begin(context.Background(), "user_456", "org_xyz", "athlete")
	if err == nil {
		t.Error("Second Begin() should fail when already active")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_Commit_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	if err != nil {
		t.Fatalf("Begin() failed: %v", err)
	}

	err = uow.Commit(context.Background())
	if err != nil {
		t.Errorf("Commit() error = %v", err)
	}

	if uow.IsActive() {
		t.Error("UnitOfWork should not be active after Commit()")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_Rollback_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectRollback()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	if err != nil {
		t.Fatalf("Begin() failed: %v", err)
	}

	err = uow.Rollback(context.Background())
	if err != nil {
		t.Errorf("Rollback() error = %v", err)
	}

	if uow.IsActive() {
		t.Error("UnitOfWork should not be active after Rollback()")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_Commit_WithTXError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit().WillReturnError(errors.New("connection lost"))

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")

	err = uow.Commit(context.Background())
	if err == nil {
		t.Error("Commit() should return error on failed commit")
	}
}

func TestUnitOfWork_Rollback_AfterCommit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	_ = uow.Commit(context.Background())

	// Second rollback should be safe
	err = uow.Rollback(context.Background())
	if err != nil {
		t.Errorf("Rollback() after Commit() should be safe: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_DoubleRollback(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectRollback()

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	_ = uow.Rollback(context.Background())

	// Second rollback should be safe
	err = uow.Rollback(context.Background())
	if err != nil {
		t.Errorf("Second Rollback() should be safe: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_CommitAfterRollback(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectRollback()

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	_ = uow.Rollback(context.Background())

	// Commit after rollback should fail
	err = uow.Commit(context.Background())
	if err == nil {
		t.Error("Commit() after Rollback() should return error")
	}
}

func TestUnitOfWork_BeginAfterClose(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_abc").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("coach_owner").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectRollback()

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	_ = uow.Rollback(context.Background())

	// Begin after close should fail
	err = uow.Begin(context.Background(), "user_456", "org_xyz", "athlete")
	if err == nil {
		t.Error("Begin() after Rollback() should fail")
	}
}

func TestUnitOfWork_ResourceCleanup_OnBeginError(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	uow := NewUnitOfWork(db)
	
	// Try to begin with invalid role (will fail before getting connection)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "")
	if err == nil {
		t.Error("Begin() should fail with empty role")
	}

	// Should not have connection
	if uow.Conn() != nil {
		t.Error("Connection should not be set on failed Begin()")
	}
}

func TestUnitOfWork_ContextPropagation(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_456").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("org_xyz").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WithArgs("super_admin").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_456", "org_xyz", "super_admin")
	if err != nil {
		t.Fatalf("Begin() failed: %v", err)
	}

	// Verify context values
	if uow.UserID() != "user_456" {
		t.Errorf("UserID() = %v, want user_456", uow.UserID())
	}
	if uow.CoachID() != "org_xyz" {
		t.Errorf("CoachID() = %v, want org_xyz", uow.CoachID())
	}
	if uow.Role() != "super_admin" {
		t.Errorf("Role() = %v, want super_admin", uow.Role())
	}

	if err := uow.Commit(context.Background()); err != nil {
		t.Errorf("Commit() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestUnitOfWork_ResourceCleanup_WithErrorDuringContext(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectExec("SELECT set_config").
		WithArgs("user_123").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("SELECT set_config").
		WillReturnError(errors.New("context failed"))
	mock.ExpectRollback()

	uow := NewUnitOfWork(db)
	err = uow.Begin(context.Background(), "user_123", "org_abc", "coach_owner")
	if err == nil {
		t.Fatal("Begin() should fail when second set_config fails")
	}

	// Verify rollback was called
	if uow.IsActive() {
		t.Error("UnitOfWork should not be active after Begin() error with rollback")
	}
}

func TestUnitOfWork_PoolReuse(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	for i := 0; i < 3; i++ {
		mock.ExpectBegin()
		mock.ExpectExec("SELECT set_config").
			WithArgs(fmt.Sprintf("user_%d", i)).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").
			WithArgs("org_test").
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").
			WithArgs("athlete").
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()

		uow := NewUnitOfWork(db)
		err = uow.Begin(context.Background(), fmt.Sprintf("user_%d", i), "org_test", "athlete")
		if err != nil {
			t.Fatalf("Begin() iteration %d failed: %v", i, err)
		}

		err = uow.Commit(context.Background())
		if err != nil {
			t.Fatalf("Commit() iteration %d failed: %v", i, err)
		}

		// Verify connection is released
		if uow.Conn() != nil {
			t.Errorf("Connection leaked in iteration %d", i)
		}
		if uow.Tx() != nil {
			t.Errorf("Transaction not cleared in iteration %d", i)
		}
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}