package subscription

import (
	"context"
	"os"
	"testing"

	"github.com/joho/godotenv"

	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// The subscription UPDATE had its arguments shifted by one: the id was passed
// as the first argument, so plan_price landed on currency (a TEXT column) and
// every update failed with "cannot encode 59 into text format for text".
// That broke the payment fulfillment, which saves the subscription to apply
// the confirmed period.
func TestSave_UpdatesAnExistingSubscription(t *testing.T) {
	// The API reads its .env at startup; the tests read the environment
	// directly, so the file is loaded here too (best effort).
	_ = godotenv.Load()
	_ = godotenv.Load("../../../.env")

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	db, err := database.Connect(url)
	if err != nil {
		t.Skipf("skipping: cannot connect to the database: %v", err)
	}
	defer db.Close()

	repo := NewRepository(db.DB)
	ctx := context.Background()

	id := "sub_update_test_" + subscription.NewSubscriptionID()

	sub, err := subscription.NewSubscription(id, "user_update_test", "user_update_test", "plan-update-test", "Plan Test", 59, "USD", "monthly", 5)
	if err != nil {
		t.Fatalf("new subscription: %v", err)
	}
	defer func() {
		_, _ = db.DB.ExecContext(ctx, `DELETE FROM subscription_payments WHERE subscription_id = $1`, id)
		_, _ = db.DB.ExecContext(ctx, `DELETE FROM subscriptions WHERE id = $1`, id)
	}()

	if err := repo.Save(ctx, sub); err != nil {
		t.Fatalf("insert subscription: %v", err)
	}

	// The second save takes the UPDATE path.
	sub.PlanPrice = 99
	sub.Status = subscription.StatusActive
	if err := repo.Save(ctx, sub); err != nil {
		t.Fatalf("update subscription: %v", err)
	}

	stored, err := repo.FindByID(ctx, id)
	if err != nil {
		t.Fatalf("find subscription: %v", err)
	}
	if stored.PlanPrice != 99 {
		t.Errorf("expected the price 99, got %v", stored.PlanPrice)
	}
	if stored.Currency != "USD" {
		t.Errorf("expected the currency USD, got %q", stored.Currency)
	}
	if stored.PlanName != "Plan Test" {
		t.Errorf("expected the plan name, got %q", stored.PlanName)
	}
	if stored.AthleteID != "user_update_test" {
		t.Errorf("expected the athlete id, got %q", stored.AthleteID)
	}
}
