package videoview

import (
	"context"
)

// Repository defines the persistence interface for video views.
type Repository interface {
	RecordVideoView(ctx context.Context, vv *VideoView) error
	ListVideoViews(ctx context.Context, athleteID, exerciseID string) ([]*VideoView, error)
}