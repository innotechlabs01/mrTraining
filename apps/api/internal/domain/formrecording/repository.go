package formrecording

import "context"

// Repository defines the form recording persistence interface.
type Repository interface {
	// Insert persists a single form recording.
	Insert(ctx context.Context, rec *FormRecording) error
}
