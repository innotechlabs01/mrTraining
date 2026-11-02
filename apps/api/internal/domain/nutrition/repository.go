package nutrition

import "context"

type Repository interface {
	CreateMealLog(ctx context.Context, log *MealLog) error
	ListMealLogs(ctx context.Context, athleteID string) ([]*MealLog, error)
}
