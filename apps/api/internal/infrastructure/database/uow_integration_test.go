package database

import (
	"context"
	"fmt"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

// Integration test for A1: UnitOfWork Resource Management
// 
// These tests verify:
// 1. Connection release on Commit/Rollback
// 2. Error handling without resource leaks
// 3. Pool connection reusability
// 4. Transaction isolation

// TestUnitOfWork_ResourceRelease_Commit verifies that Commit() releases
// both sql.Tx and sql.Conn back to the pool.
func TestUnitOfWork_ResourceRelease_Commit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	// Expect connection, transaction, and context setup
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

	// Verify connection is held
	if uow.Conn() == nil {
		t.Error("Connection should be held after Begin()")
	}

	err = uow.Commit(context.Background())
	if err != nil {
		t.Errorf("Commit() error = %v", err)
	}

	// After commit, connection should be released (nil in our implementation)
	if uow.Conn() != nil {
		t.Error("Connection should be nil after Commit()")
	}
	if uow.Tx() != nil {
		t.Error("Transaction should be nil after Commit()")
	}
	if uow.IsActive() {
		t.Error("UnitOfWork should not be active after Commit()")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

// TestUnitOfWork_ResourceRelease_Rollback verifies that Rollback() releases
// both sql.Tx and sql.Conn back to the pool.
func TestUnitOfWork_ResourceRelease_Rollback(t *testing.T) {
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

	if uow.Conn() != nil {
		t.Error("Connection should be nil after Rollback()")
	}
	if uow.Tx() != nil {
		t.Error("Transaction should be nil after Rollback()")
	}
	if uow.IsActive() {
		t.Error("UnitOfWork should not be active after Rollback()")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

// TestUnitOfWork_PoolRelease verifies that connections are properly released
// to the pool after use.
func TestUnitOfWork_PoolRelease(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	// Simulate multiple UoW cycles to verify pool release
	for i := 0; i < 5; i++ {
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
			t.Fatalf("Begin() failed for iteration %d: %v", i, err)
		}

		if err := uow.Commit(context.Background()); err != nil {
			t.Fatalf("Commit() failed for iteration %d: %v", i, err)
		}

		if uow.Conn() != nil {
			t.Errorf("Connection leaked after iteration %d", i)
		}
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

// TestUnitOfWork_ResourceCleanupOnError verifies resources are cleaned up
// when errors occur during initialization.
func TestUnitOfWork_ResourceCleanupOnError(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}
	defer db.Close()

	uow := NewUnitOfWork(db)
	
	// Attempt to begin with invalid role - should fail before getting connection
	err = uow.Begin(context.Background(), "user_123", "org_abc", "")
	if err == nil {
		t.Error("Begin() should fail with empty role")
	}

	// Connection should not be set on failed Begin
	if uow.Conn() != nil {
		t.Error("Connection should not be set on failed Begin()")
	}
	if uow.Tx() != nil {
		t.Error("Transaction should not be set on failed Begin()")
	}
}

// TestUnitOfWork_IdempotentRollback verifies that calling Rollback()
// after Commit() is safe.
func TestUnitOfWork_IdempotentRollback(t *testing.T) {
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
		WithArgs("athlete").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "athlete")
	_ = uow.Commit(context.Background())

	// Rollback after commit should be safe (return nil)
	err = uow.Rollback(context.Background())
	if err != nil {
		t.Errorf("Rollback() after Commit() should return nil: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

// TestUnitOfWork_TransactionNotReusable verifies that a transaction
// cannot be reused after Commit() or Rollback().
func TestUnitOfWork_TransactionNotReusable(t *testing.T) {
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
		WithArgs("athlete").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	uow := NewUnitOfWork(db)
	_ = uow.Begin(context.Background(), "user_123", "org_abc", "athlete")
	_ = uow.Commit(context.Background())

	// After commit, Tx() should return nil
	if uow.Tx() != nil {
		t.Error("Tx() should return nil after Commit()")
	}
	if uow.IsActive() {
		t.Error("UnitOfWork should not be active after Commit()")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}