package trm

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

// mockTRMServer sirve una respuesta falsa de datos.gov.co con el valor dado.
func mockTRMServer(t *testing.T, valor string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `[
			{"valor": "`+valor+`", "vigenciadesde": "2026-01-01"}
		]`)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestTRMService_AppliesEightPercentMargin(t *testing.T) {
	srv := mockTRMServer(t, "4000")

	s := NewService(nil)
	s.baseURL = srv.URL

	rate, err := s.GetCurrent(context.Background())
	require.NoError(t, err)

	// 4000 * 1.08 = 4320
	require.Equal(t, 4320.0, rate.Value)
	require.Equal(t, 8, rate.MarginPct)
	require.Equal(t, "datos.gov.co", rate.Source)
	require.Equal(t, "2026-01-01", rate.VigenciaD)
	require.NotZero(t, rate.FetchedAt)
}

func TestTRMService_CacheTTLIsFourHours(t *testing.T) {
	require.Equal(t, 4*time.Hour, cacheTTL, "el caché debe ser de 4 horas")
}

func TestTRMService_GetStoredReadsFromDB(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	payload := map[string]interface{}{
		"value":          4320.0,
		"vigencia_desde": "2026-01-01",
		"fetched_at":     time.Now().UTC().Format(time.RFC3339),
		"margin_pct":     8,
		"source":         "datos.gov.co",
	}
	valueBytes, _ := json.Marshal(payload)

	mock.ExpectQuery("SELECT value FROM platform_settings").
		WithArgs("trm.current").
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow(valueBytes))

	s := NewService(db)
	rate, err := s.GetStored(context.Background())
	require.NoError(t, err)
	require.Equal(t, 4320.0, rate.Value)
	require.Equal(t, 8, rate.MarginPct)
	require.Equal(t, "datos.gov.co", rate.Source)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTRMService_GetStoredNoRows(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mock.ExpectQuery("SELECT value FROM platform_settings").
		WithArgs("trm.current").
		WillReturnError(sql.ErrNoRows)

	s := NewService(db)
	_, err = s.GetStored(context.Background())
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTRMService_FetchFailureFallsBackToStored(t *testing.T) {
	// Servidor que siempre falla con 500
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(srv.Close)

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	payload := map[string]interface{}{
		"value":          4320.0,
		"vigencia_desde": "2026-01-01",
		"fetched_at":     time.Now().UTC().Format(time.RFC3339),
		"margin_pct":     8,
		"source":         "datos.gov.co",
	}
	valueBytes, _ := json.Marshal(payload)

	// La consulta de fallback a platform_settings debe devolver el valor guardado
	mock.ExpectQuery("SELECT value FROM platform_settings").
		WithArgs("trm.current").
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow(valueBytes))

	s := NewService(db)
	s.baseURL = srv.URL

	rate, err := s.GetCurrent(context.Background())
	require.NoError(t, err)
	require.Equal(t, 4320.0, rate.Value)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTRMService_NoDBDegradedModeStillWorks(t *testing.T) {
	srv := mockTRMServer(t, "3000")

	s := NewService(nil) // sin DB
	s.baseURL = srv.URL

	rate, err := s.GetCurrent(context.Background())
	require.NoError(t, err)
	require.Equal(t, 3000.0*1.08, rate.Value)

	// GetStored sin DB debe devolver error
	_, err = s.GetStored(context.Background())
	require.Error(t, err)
	require.Contains(t, err.Error(), "no database")
}

func TestTRMService_SaveToDBPayloadContainsFields(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mock.ExpectExec("INSERT INTO platform_settings").
		WithArgs("trm.current", sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	s := NewService(db)
	rate := &Rate{
		Value:     4320.0,
		VigenciaD: "2026-01-01",
		FetchedAt: time.Now().UTC(),
		MarginPct: 8,
		Source:    "datos.gov.co",
	}

	require.NoError(t, s.saveToDB(context.Background(), rate))
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTRMService_ConcurrentGetCurrentIsSafe(t *testing.T) {
	srv := mockTRMServer(t, "5000")

	s := NewService(nil)
	s.baseURL = srv.URL

	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			rate, err := s.GetCurrent(context.Background())
			require.NoError(t, err)
			require.Equal(t, 5000.0*1.08, rate.Value)
			done <- true
		}()
	}
	for i := 0; i < 10; i++ {
		<-done
	}
}
