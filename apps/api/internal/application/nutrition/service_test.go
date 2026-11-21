package nutrition

import (
	"context"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/domain/nutrition"
)

type fakeRepo struct {
	logs []*nutrition.MealLog
}

func (f *fakeRepo) CreateMealLog(_ context.Context, log *nutrition.MealLog) error {
	f.logs = append(f.logs, log)
	return nil
}

func (f *fakeRepo) ListMealLogs(_ context.Context, athleteID string) ([]*nutrition.MealLog, error) {
	var out []*nutrition.MealLog
	for _, l := range f.logs {
		if l.AthleteID == athleteID {
			out = append(out, l)
		}
	}
	return out, nil
}

func TestService_CreateAndListMealLogs(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)
	ctx := context.Background()

	_, err := svc.CreateMealLog(ctx, "", CreateMealLogRequest{MealType: "desayuno"})
	if err == nil {
		t.Fatal("expected error when athleteID is empty")
	}

	_, err = svc.CreateMealLog(ctx, "ath-1", CreateMealLogRequest{MealType: ""})
	if err == nil {
		t.Fatal("expected error when mealType is empty")
	}

	created, err := svc.CreateMealLog(ctx, "ath-1", CreateMealLogRequest{
		MealType: "desayuno",
		Foods: []nutrition.FoodEntry{
			{FoodName: "Avena", Serving: "100g", Servings: 1, Calories: 350, ProteinG: 12, CarbsG: 60, FatG: 6},
		},
		Macros: map[string]float64{
			"calories": 350,
			"protein":  12,
			"carbs":    60,
			"fat":      6,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if created.ID == "" || created.AthleteID != "ath-1" {
		t.Fatalf("unexpected created log: %+v", created)
	}

	datePrefix := created.LoggedAt[:10]
	macros, err := svc.GetDailyMacros(ctx, "ath-1", datePrefix)
	if err != nil {
		t.Fatalf("GetDailyMacros error: %v", err)
	}
	if macros.Calories != 350 || macros.Protein != 12 || macros.Carbs != 60 || macros.Fat != 6 {
		t.Fatalf("unexpected macros: %+v", macros)
	}
}
