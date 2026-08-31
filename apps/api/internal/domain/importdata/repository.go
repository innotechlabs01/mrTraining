package importdata

import (
	"context"
)

// Repository defines the persistence interface for import jobs.
type Repository interface {
	CreateImportJob(ctx context.Context, job *ImportJob) error
	GetImportJob(ctx context.Context, id string) (*ImportJob, error)
	ListImportJobs(ctx context.Context, athleteID string) ([]*ImportJob, error)
	UpdateImportJob(ctx context.Context, job *ImportJob) error
}