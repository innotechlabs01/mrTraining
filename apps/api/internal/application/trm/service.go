// Package trm provides the current Colombian exchange rate (TRM)
// from the datos.gov.co open-data API with in-memory caching and
// persistence in platform_settings (clave trm.current).
package trm

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

const (
	datosGovURL = "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1"
	cacheTTL    = 4 * time.Hour
	marginPct   = 8 // margen de negocio del 8%
	trmKey      = "trm.current"
	trmSource   = "datos.gov.co"
)

// Rate represents a TRM snapshot. Value already includes the 8% margin.
type Rate struct {
	Value     float64   `json:"value"`
	VigenciaD string    `json:"vigencia_desde"`
	FetchedAt time.Time `json:"fetched_at"`
	MarginPct int       `json:"margin_pct"`
	Source    string    `json:"source"`
}

// Service fetches and caches the current TRM, persisting it in platform_settings.
type Service struct {
	mu      sync.RWMutex
	cached  *Rate
	client  *http.Client
	flight  *resilience.Flight[*Rate]
	db      *sql.DB // puede ser nil: modo degradado, solo caché en memoria
	baseURL string  // override para pruebas; por defecto datosGovURL
}

// NewService creates a new TRM service. db puede ser nil para modo degradado.
func NewService(db *sql.DB) *Service {
	cb := resilience.RegisterBreaker(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
		Name:             "trm_datosgov",
		FailureThreshold: 4,
		ResetTimeout:     60 * time.Second,
	}))
	retry := resilience.DefaultRetryConfig()
	retry.MaxAttempts = 2
	return &Service{
		client: resilience.NewHTTPClient(resilience.HTTPClientConfig{
			Name:    "trm_datosgov",
			Timeout: 6 * time.Second,
			Breaker: cb,
			Retry:   &retry,
		}),
		flight:  resilience.NewFlight[*Rate](8 * time.Second),
		db:      db,
		baseURL: datosGovURL,
	}
}

// marginMultiplier returns 1 + marginPct/100 (1.08 para 8%).
func marginMultiplier() float64 {
	return 1 + float64(marginPct)/100
}

// GetCurrent returns the current TRM, fetching from the source if the cache is stale.
// Si la fuente falla, conserva el último valor en platform_settings y no falla duro.
func (s *Service) GetCurrent(ctx context.Context) (*Rate, error) {
	// 1. Caché en memoria.
	s.mu.RLock()
	if s.cached != nil && time.Since(s.cached.FetchedAt) < cacheTTL {
		rate := *s.cached
		s.mu.RUnlock()
		return &rate, nil
	}
	s.mu.RUnlock()

	// 2. Intentar fetch desde la fuente externa (coalescido vía singleflight).
	var rate *Rate
	var err error
	if s.flight != nil {
		rate, _, err = s.flight.Do(ctx, "trm:current", func(inner context.Context) (*Rate, error) {
			return s.fetch(inner)
		})
	} else {
		rate, err = s.fetch(ctx)
	}
	if err != nil {
		// Fuente no disponible: fallback al valor persistido en DB.
		if stored, gerr := s.GetStored(ctx); gerr == nil {
			s.mu.Lock()
			s.cached = stored
			s.mu.Unlock()
			return stored, nil
		}
		// Último recurso: caché en memoria aunque esté caducada.
		s.mu.RLock()
		if s.cached != nil {
			rate := *s.cached
			s.mu.RUnlock()
			return &rate, nil
		}
		s.mu.RUnlock()
		return nil, fmt.Errorf("trm: fuente no disponible y no hay valor almacenado: %w", err)
	}

	// 3. Actualizar caché en memoria.
	s.mu.Lock()
	s.cached = rate
	s.mu.Unlock()

	// 4. Persistir en platform_settings (mejor esfuerzo, no bloquea al llamante).
	_ = s.saveToDB(ctx, rate)

	return rate, nil
}

// GetStored lee la TRM desde platform_settings (clave trm.current).
// Fallback a caché en memoria si no hay DB.
func (s *Service) GetStored(ctx context.Context) (*Rate, error) {
	if s.db == nil {
		return nil, fmt.Errorf("trm: no database configured")
	}

	var value []byte
	err := s.db.QueryRowContext(ctx, `SELECT value FROM platform_settings WHERE key = $1`, trmKey).Scan(&value)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("trm: no stored rate for key %s", trmKey)
	}
	if err != nil {
		return nil, fmt.Errorf("trm: read stored rate: %w", err)
	}

	var raw struct {
		Value         float64 `json:"value"`
		VigenciaDesde string  `json:"vigencia_desde"`
		FetchedAt     string  `json:"fetched_at"`
		MarginPct     int     `json:"margin_pct"`
		Source        string  `json:"source"`
	}
	if err := json.Unmarshal(value, &raw); err != nil {
		return nil, fmt.Errorf("trm: decode stored rate: %w", err)
	}

	fetchedAt, err := time.Parse(time.RFC3339, raw.FetchedAt)
	if err != nil {
		fetchedAt = time.Now()
	}

	return &Rate{
		Value:     raw.Value,
		VigenciaD: raw.VigenciaDesde,
		FetchedAt: fetchedAt,
		MarginPct: raw.MarginPct,
		Source:    raw.Source,
	}, nil
}

// fetch consulta datos.gov.co y devuelve la TRM con el margen del 8% ya aplicado.
func (s *Service) fetch(ctx context.Context) (*Rate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL, nil)
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
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("trm fetch: status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
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

	return &Rate{
		Value:     value * marginMultiplier(),
		VigenciaD: records[0].VigenciaDesde,
		FetchedAt: time.Now().UTC(),
		MarginPct: marginPct,
		Source:    trmSource,
	}, nil
}

// saveToDB persiste la TRM en platform_settings con clave trm.current.
// Es mejor esfuerzo: un error no falla la operación.
func (s *Service) saveToDB(ctx context.Context, rate *Rate) error {
	if s.db == nil {
		return nil
	}

	payload := map[string]interface{}{
		"value":          rate.Value,
		"vigencia_desde": rate.VigenciaD,
		"fetched_at":     rate.FetchedAt.UTC().Format(time.RFC3339),
		"margin_pct":     rate.MarginPct,
		"source":         rate.Source,
	}
	value, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("trm marshal payload: %w", err)
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO platform_settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
	`, trmKey, value)
	if err != nil {
		return fmt.Errorf("trm save to db: %w", err)
	}
	return nil
}
