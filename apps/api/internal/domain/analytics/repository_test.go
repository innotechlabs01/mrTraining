package analytics_test

import (
	"testing"
	"reflect"

	analyticsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/analytics"
)

func TestAnalyticsRepositoryInterfaceExists(t *testing.T) {
	if analyticsdomain.Repository(nil) == nil {
		// Interface exists, but we need to ensure it's defined
	}
	// Verify interface type exists
	typ := reflect.TypeOf((*analyticsdomain.Repository)(nil)).Elem()
	if typ.Kind() != reflect.Interface {
		t.Fatalf("Repository is not an interface")
	}
}

func TestAnalyticsAggregateExists(t *testing.T) {
	typ := reflect.TypeOf(analyticsdomain.DashboardSummary{})
	if typ.Kind() != reflect.Struct {
		t.Fatalf("DashboardSummary is not a struct")
	}
}
