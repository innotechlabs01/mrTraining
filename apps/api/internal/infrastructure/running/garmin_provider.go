package running

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
)

// GarminProvider implements domain.WearableProvider against the Garmin Health
// API. It is disabled unless GARMIN_CLIENT_ID / GARMIN_CLIENT_SECRET are set,
// so the API boots the same with or without partner credentials.
//
// Important limitation: the Health API activity list returns summaries (no
// GPS route). Route detail arrives through the activity-file downloads endpoint
// or the file-import endpoint (POST /running/import), which shares the same
// parser. Sessions synced here are marked source="garmin" and get their route
// when the athlete uploads the FIT/TCX file.
type GarminProvider struct {
	baseURL      string
	clientID     string
	clientSecret string
	tokens       *TokenStore
	http         *http.Client
}

// TokenStore persists wearable OAuth tokens.
type TokenStore struct {
	db *sql.DB
}

// NewTokenStore creates a token store over the given database.
func NewTokenStore(db *sql.DB) *TokenStore {
	return &TokenStore{db: db}
}

// Get returns the token row for a user/platform, or sql.ErrNoRows.
func (s *TokenStore) Get(ctx context.Context, userID, platform string) (access, refresh, expiresAt string, err error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT access_token, COALESCE(refresh_token, ''), COALESCE(expires_at, '')
		 FROM wearable_oauth_tokens WHERE user_id = $1 AND platform = $2`, userID, platform)
	err = row.Scan(&access, &refresh, &expiresAt)
	return
}

// Save upserts a token row.
func (s *TokenStore) Save(ctx context.Context, userID, platform, access, refresh, expiresAt, scope string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO wearable_oauth_tokens (id, user_id, platform, access_token, refresh_token, expires_at, scope)
		 VALUES ($3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT(user_id, platform) DO UPDATE SET
		   access_token = excluded.access_token,
		   refresh_token = excluded.refresh_token,
		   expires_at = excluded.expires_at,
		   scope = excluded.scope,
		   updated_at = NOW()`,
		uuid.New().String(), userID, platform, access, refresh, nullIfEmpty(expiresAt), nullIfEmpty(scope))
	if err != nil {
		return fmt.Errorf("save wearable token: %w", err)
	}
	return nil
}

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// NewGarminProvider builds a provider from environment configuration.
// Returns a provider whose IsAvailable() is false when credentials are absent.
func NewGarminProvider(tokens *TokenStore) *GarminProvider {
	base := strings.TrimRight(os.Getenv("GARMIN_API_BASE"), "/")
	if base == "" {
		base = "https://apis.garmin.com"
	}
	return &GarminProvider{
		baseURL:      base,
		clientID:     os.Getenv("GARMIN_CLIENT_ID"),
		clientSecret: os.Getenv("GARMIN_CLIENT_SECRET"),
		tokens:       tokens,
		http:         &http.Client{Timeout: 20 * time.Second},
	}
}

// Name returns the provider identifier.
func (p *GarminProvider) Name() string { return "garmin" }

// IsAvailable reports whether partner credentials are configured.
func (p *GarminProvider) IsAvailable(_ context.Context) bool {
	return p.clientID != "" && p.clientSecret != ""
}

type garminActivity struct {
	ActivityID          int64   `json:"activityId"`
	ActivityType        string  `json:"activityType"`
	StartTimeSeconds    int64   `json:"startTimeInSeconds"`
	DurationSeconds     int64   `json:"durationInSeconds"`
	DistanceMeters      float64 `json:"distanceInMeters"`
	ElevationGainMeters float64 `json:"elevationGainInMeters"`
	AverageHR           float64 `json:"averageHeartRateInBeatsPerMinute"`
	MaxHR               float64 `json:"maxHeartRateInBeatsPerMinute"`
	Calories            float64 `json:"activeKilocalories"`
	AverageCadence      float64 `json:"averageRunCadenceInStepsPerMinute"`
	DeviceName          string  `json:"deviceName"`
}

// FetchSessions pulls running activities from Garmin for the date range.
// Non-running activities are ignored.
func (p *GarminProvider) FetchSessions(ctx context.Context, userID string, from, to time.Time) ([]domain.RunningSession, error) {
	access, _, expiresAt, err := p.tokens.Get(ctx, userID, "garmin")
	if err != nil {
		return nil, fmt.Errorf("garmin token: %w", err)
	}
	if access == "" {
		return nil, fmt.Errorf("garmin not connected for user")
	}
	if expiresAt != "" {
		if t, perr := time.Parse(time.RFC3339, expiresAt); perr == nil && time.Now().After(t) {
			return nil, fmt.Errorf("garmin token expired — reconnect required")
		}
	}

	q := url.Values{}
	q.Set("uploadStartTimeInSeconds", strconv.FormatInt(from.Unix(), 10))
	q.Set("uploadEndTimeInSeconds", strconv.FormatInt(to.Unix(), 10))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		p.baseURL+"/wellness-api/rest/activities$10"+q.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("garmin request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+access)
	req.Header.Set("Accept", "application/json")

	resp, err := p.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("garmin fetch: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("garmin fetch status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var activities []garminActivity
	if err := json.NewDecoder(resp.Body).Decode(&activities); err != nil {
		return nil, fmt.Errorf("garmin decode: %w", err)
	}

	out := make([]domain.RunningSession, 0, len(activities))
	for _, a := range activities {
		if !strings.Contains(strings.ToLower(a.ActivityType), "run") {
			continue
		}
		start := time.Unix(a.StartTimeSeconds, 0).UTC()
		duration := int(a.DurationSeconds)
		distance := a.DistanceMeters / 1000
		deviceName := a.DeviceName
		if deviceName == "" {
			deviceName = "Garmin"
		}
		// Missing activity ids must not collapse distinct runs into one import.
		externalID := ""
		if a.ActivityID != 0 {
			externalID = strconv.FormatInt(a.ActivityID, 10)
		}
		out = append(out, domain.RunningSession{
			UserID:      userID,
			Date:        start.Format("2006-01-02"),
			Distance:    round2(distance),
			Duration:    duration,
			Pace:        paceFor(distance, duration),
			Speed:       speedFor(distance, duration),
			Calories:    int(a.Calories),
			Elevation:   round2(a.ElevationGainMeters),
			HeartRate:   int(a.AverageHR),
			Cadence:     int(a.AverageCadence),
			Source:      domain.SourceGarmin,
			ExternalID:  externalID,
			DeviceName:  deviceName,
			DeviceBrand: "Garmin",
		})
	}
	return out, nil
}

// SyncHealthData pulls Garmin dailies (steps, resting HR) for the user.
func (p *GarminProvider) SyncHealthData(ctx context.Context, userID string) (*domain.HealthData, error) {
	access, _, _, err := p.tokens.Get(ctx, userID, "garmin")
	if err != nil || access == "" {
		return nil, fmt.Errorf("garmin token unavailable")
	}

	end := time.Now().UTC()
	start := end.AddDate(0, 0, -1)
	q := url.Values{}
	q.Set("uploadStartTimeInSeconds", strconv.FormatInt(start.Unix(), 10))
	q.Set("uploadEndTimeInSeconds", strconv.FormatInt(end.Unix(), 10))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		p.baseURL+"/wellness-api/rest/dailies$11"+q.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("garmin dailies request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+access)

	resp, err := p.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("garmin dailies: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("garmin dailies status %d", resp.StatusCode)
	}

	var dailies []struct {
		Steps         int     `json:"steps"`
		RestingHR     float64 `json:"restingHeartRateInBeatsPerMinute"`
		AverageStress float64 `json:"averageStressLevel"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&dailies); err != nil {
		return nil, fmt.Errorf("garmin dailies decode: %w", err)
	}

	data := &domain.HealthData{}
	for _, d := range dailies {
		data.Steps += d.Steps
		if d.RestingHR > 0 {
			data.RestingHR = int(d.RestingHR)
		}
	}
	return data, nil
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

func paceFor(distanceKm float64, durationSec int) string {
	if distanceKm <= 0 || durationSec <= 0 {
		return ""
	}
	paceSeconds := float64(durationSec) / distanceKm
	return fmt.Sprintf("%d:%02d", int(paceSeconds)/60, int(paceSeconds)%60)
}

func speedFor(distanceKm float64, durationSec int) float64 {
	if distanceKm <= 0 || durationSec <= 0 {
		return 0
	}
	return round2(distanceKm / (float64(durationSec) / 3600))
}
