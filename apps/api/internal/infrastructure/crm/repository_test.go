package crm

import (
	"context"
	"os"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/stretchr/testify/require"
)

func setupCrmRepo(t *testing.T) *Repository {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL no configurada: prueba de integración CRM omitida")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Skipf("no se puede conectar a la base de datos: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewRepository(db.DB)
}

// mustSeedRevenueLedger crea coaches activo/inactivo y filas del ledger,
// devolviendo los IDs para hacer aserciones. Limpia al final.
func mustSeedRevenueLedger(t *testing.T, repo *Repository) (activeCoachID, inactiveCoachID string) {
	t.Helper()
	ctx := context.Background()

	activeCoachID = "coach-rev-active-001"
	inactiveCoachID = "coach-rev-inactive-001"

	_, err := repo.db.ExecContext(ctx, `
		INSERT INTO coaches (id, email, name, is_active, skip_subscription, created_at, updated_at)
		VALUES ($1, $2, $3, 1, false, NOW(), NOW()),
		       ($4, $5, $6, 0, false, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active
	`, activeCoachID, "rev.active@mrtraining.test", "Rev Active",
		inactiveCoachID, "rev.inactive@mrtraining.test", "Rev Inactive")
	require.NoError(t, err)

	// approved del coach activo -> cuenta
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO wompi_payment_ledger (id, wompi_transaction_id, athlete_id, coach_id,
		                                  gross_amount_cents, status, period_start, period_end, payment_period, currency)
		VALUES ($1, $2, $3, $4, 10000, 'approved', NOW(), NOW() + interval '1 month', '2026-01', 'COP')
	`, "ledger-rev-approved-001", "wompi-tx-rev-approved-001", "athlete-rev-001", activeCoachID)
	require.NoError(t, err)

	// pending del coach activo -> NO cuenta
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO wompi_payment_ledger (id, wompi_transaction_id, athlete_id, coach_id,
		                                  gross_amount_cents, status, period_start, period_end, payment_period, currency)
		VALUES ($1, $2, $3, $4, 5000, 'pending', NOW(), NOW() + interval '1 month', '2026-01', 'COP')
	`, "ledger-rev-pending-001", "wompi-tx-rev-pending-001", "athlete-rev-002", activeCoachID)
	require.NoError(t, err)

	// approved del coach inactivo -> NO cuenta (fuera de alcance)
	_, err = repo.db.ExecContext(ctx, `
		INSERT INTO wompi_payment_ledger (id, wompi_transaction_id, athlete_id, coach_id,
		                                  gross_amount_cents, status, period_start, period_end, payment_period, currency)
		VALUES ($1, $2, $3, $4, 90000, 'approved', NOW(), NOW() + interval '1 month', '2026-01', 'COP')
	`, "ledger-rev-inactive-001", "wompi-tx-rev-inactive-001", "athlete-rev-003", inactiveCoachID)
	require.NoError(t, err)

	t.Cleanup(func() {
		repo.db.ExecContext(ctx, `DELETE FROM wompi_payment_ledger WHERE id IN ($1,$2,$3)`,
			"ledger-rev-approved-001", "ledger-rev-pending-001", "ledger-rev-inactive-001")
		repo.db.ExecContext(ctx, `DELETE FROM coaches WHERE id IN ($1,$2)`, activeCoachID, inactiveCoachID)
	})
	return
}

func TestGetRevenueStats_ApprovedIncluded_PendingExcluded_InactiveCoachExcluded(t *testing.T) {
	repo := setupCrmRepo(t)
	activeCoachID, inactiveCoachID := mustSeedRevenueLedger(t, repo)

	stats, err := repo.GetRevenueStats(context.Background())
	require.NoError(t, err)

	// Solo el approved del coach activo (10000 cents = 100.00) debe sumarse.
	require.Equal(t, 100.00, stats.Total, "el approved del coach activo debe contar como ingreso")
	require.Equal(t, 100.00, stats.ThisMonth, "el approved del coach activo debe contar este mes")
	require.NotEqual(t, inactiveCoachID, activeCoachID)
	_ = inactiveCoachID
}
