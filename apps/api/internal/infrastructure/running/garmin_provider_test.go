package running

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestGarminProvider_FetchSessionsAndSyncHealthData_QueryString(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	var capturedPaths []string
	rt := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		capturedPaths = append(capturedPaths, r.URL.Path+"?"+r.URL.RawQuery)
		var buf bytes.Buffer
		switch r.URL.Path {
		case "/wellness-api/rest/activities":
			_ = json.NewEncoder(&buf).Encode([]garminActivity{{
				ActivityID:       42,
				ActivityType:     "RUNNING",
				StartTimeSeconds: 1700000000,
				DurationSeconds:  1800,
				DistanceMeters:   5000,
			}})
		case "/wellness-api/rest/dailies":
			_ = json.NewEncoder(&buf).Encode([]map[string]any{{
				"steps":                            8500,
				"restingHeartRateInBeatsPerMinute": 52,
				"averageStressLevel":               20,
			}})
		default:
			return &http.Response{StatusCode: http.StatusNotFound, Header: make(http.Header), Body: io.NopCloser(&buf)}, nil
		}
		return &http.Response{StatusCode: http.StatusOK, Header: make(http.Header), Body: io.NopCloser(&buf)}, nil
	})

	tokens := NewTokenStore(db)
	provider := &GarminProvider{
		baseURL:      "https://garmin.test",
		clientID:     "cid",
		clientSecret: "csec",
		tokens:       tokens,
		http:         &http.Client{Transport: rt},
	}

	mock.ExpectQuery(regexp.QuoteMeta("SELECT access_token")).
		WithArgs("user-1", "garmin").
		WillReturnRows(sqlmock.NewRows([]string{"access_token", "refresh_token", "expires_at"}).
			AddRow("tok-abc", "", ""))

	from := time.Unix(1700000000, 0).UTC()
	to := from.Add(24 * time.Hour)
	sessions, err := provider.FetchSessions(context.Background(), "user-1", from, to)
	require.NoError(t, err)
	require.Len(t, sessions, 1)
	require.Equal(t, "garmin", sessions[0].Source)

	mock.ExpectQuery(regexp.QuoteMeta("SELECT access_token")).
		WithArgs("user-1", "garmin").
		WillReturnRows(sqlmock.NewRows([]string{"access_token", "refresh_token", "expires_at"}).
			AddRow("tok-abc", "", ""))

	hd, err := provider.SyncHealthData(context.Background(), "user-1")
	require.NoError(t, err)
	require.Equal(t, 8500, hd.Steps)
	require.Len(t, capturedPaths, 2)
	require.Contains(t, capturedPaths[0], "/wellness-api/rest/activities?uploadEndTimeInSeconds=")
	require.Contains(t, capturedPaths[1], "/wellness-api/rest/dailies?uploadEndTimeInSeconds=")
	require.NoError(t, mock.ExpectationsWereMet())
}
