// Package trm provides the current Colombian exchange rate (TRM)
// from the Superintendencia Financiera open-data API with in-memory caching.
package trm

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"
)

const (
	datosGovURL = "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1"
	cacheTTL    = time.Hour
)

// Rate represents a TRM snapshot.
type Rate struct {
	Value     float64   `json:"value"`
	VigenciaD string    `json:"vigencia_desde"`
	FetchedAt time.Time `json:"fetched_at"`
}

// Service fetches and caches the current TRM.
type Service struct {
	mu     sync.RWMutex
	cached *Rate
	client *http.Client
}

// NewService creates a new TRM service.
func NewService() *Service {
	return &Service{client: &http.Client{Timeout: 10 * time.Second}}
}

// GetCurrent returns the current TRM, fetching from the source if the cache is stale.
func (s *Service) GetCurrent(ctx context.Context) (*Rate, error) {
	s.mu.RLock()
	if s.cached != nil && time.Since(s.cached.FetchedAt) < cacheTTL {
		rate := *s.cached
		s.mu.RUnlock()
		return &rate, nil
	}
	s.mu.RUnlock()

	return s.fetch(ctx)
}

func (s *Service) fetch(ctx context.Context) (*Rate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, datosGovURL, nil)
	if err != nil {
		return nil, fmt.Errorf("trm fetch: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("trm fetch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("trm fetch: status %d", resp.StatusCode)
	}

	var records []struct {
		Valor         string `json:"valor"`
		VigenciaDesde string `json:"vigenciadesde"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&records); err != nil {
		return nil, fmt.Errorf("trm decode: %w", err)
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("trm fetch: no records")
	}

	value, err := strconv.ParseFloat(records[0].Valor, 64)
	if err != nil {
		return nil, fmt.Errorf("trm parse value: %w", err)
	}

	rate := &Rate{
		Value:     value,
		VigenciaD: records[0].VigenciaDesde,
		FetchedAt: time.Now(),
	}

	s.mu.Lock()
	s.cached = rate
	s.mu.Unlock()

	result := *rate
	return &result, nil
}
