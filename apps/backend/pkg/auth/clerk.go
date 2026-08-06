package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

var (
	ErrMissingAuthHeader  = errors.New("missing authorization header")
	ErrInvalidAuthHeader  = errors.New("invalid authorization header format")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenInvalid       = errors.New("token invalid")
	ErrTokenMalformed     = errors.New("token malformed")
	ErrIssuerMismatch     = errors.New("issuer mismatch")
	ErrAudienceMismatch   = errors.New("audience mismatch")
	ErrKeyNotFound        = errors.New("signing key not found")
	ErrClaimsMissing      = errors.New("required claims missing")
)

type ClerkConfig struct {
	JWKSURL           string
	Issuer            string
	Audience          string
	AllowedClockSkew  time.Duration
	RefreshInterval   time.Duration
	Logger            *zerolog.Logger
}

type ClerkClaims struct {
	jwt.RegisteredClaims
	UserID          string                 `json:"sub"`
	Email           string                 `json:"email"`
	FirstName       string                 `json:"given_name"`
	LastName        string                 `json:"family_name"`
	OrgID           string                 `json:"org_id"`
	OrgRole         string                 `json:"org_role"`
	OrgSlug         string                 `json:"org_slug"`
	SessionID       string                 `json:"sid"`
	Actor           map[string]interface{} `json:"act"`
	PublicMetadata  map[string]interface{} `json:"public_metadata"`
	PrivateMetadata map[string]interface{} `json:"private_metadata"`
}

var clerkIDNamespace = uuid.MustParse("018f4e8e-7b4c-7e6e-8f3e-4e8e7b4c7e6e")

func ClerkIDToInternal(clerkID string) uuid.UUID {
	if clerkID == "" {
		return uuid.Nil
	}
	return uuid.NewSHA1(clerkIDNamespace, []byte(clerkID))
}

func (c *ClerkClaims) GetUserID() (uuid.UUID, error) {
	return uuid.Parse(c.UserID)
}

func (c *ClerkClaims) InternalUserID() uuid.UUID {
	if c.UserID == "" {
		return uuid.Nil
	}
	return uuid.NewSHA1(clerkIDNamespace, []byte(c.UserID))
}

func (c *ClerkClaims) GetOrgID() (uuid.UUID, error) {
	if c.OrgID == "" {
		return uuid.Nil, nil
	}
	return uuid.Parse(c.OrgID)
}

func (c *ClerkClaims) InternalOrgID() uuid.UUID {
	if c.OrgID == "" {
		return uuid.Nil
	}
	return uuid.NewSHA1(clerkIDNamespace, []byte(c.OrgID))
}

func (c *ClerkClaims) Role() string {
	if c.PublicMetadata == nil {
		return ""
	}
	role, _ := c.PublicMetadata["role"].(string)
	return role
}

func (c *ClerkClaims) CoachID() string {
	if c.PublicMetadata == nil {
		return ""
	}
	coachID, _ := c.PublicMetadata["coachId"].(string)
	return coachID
}

type JWKSProvider struct {
	kf              keyfunc.Keyfunc
	jwksURL         string
	refreshInterval time.Duration
	logger          *zerolog.Logger
	mu              sync.RWMutex
	stopCh          chan struct{}
}

func NewJWKSProvider(cfg ClerkConfig) (*JWKSProvider, error) {
	logger := zerolog.Nop()
	if cfg.Logger != nil {
		logger = *cfg.Logger
	}

	if cfg.JWKSURL == "" {
		return nil, errors.New("jwks_url is required")
	}
	if cfg.Issuer == "" {
		return nil, errors.New("issuer is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	kf, err := keyfunc.NewDefaultCtx(ctx, []string{cfg.JWKSURL})
	if err != nil {
		return nil, fmt.Errorf("failed to create JWKS keyfunc: %w", err)
	}

	p := &JWKSProvider{
		kf:              kf,
		jwksURL:         cfg.JWKSURL,
		refreshInterval: cfg.RefreshInterval,
		logger:          &logger,
		stopCh:          make(chan struct{}),
	}

	go p.refreshLoop()
	return p, nil
}

func (p *JWKSProvider) refreshLoop() {
	ticker := time.NewTicker(p.refreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			// Refresh by creating new keyfunc with updated keys
			newKf, err := keyfunc.NewDefaultCtx(ctx, []string{p.jwksURL})
			if err != nil {
				p.logger.Error().Err(err).Msg("JWKS background refresh failed")
			} else {
				p.mu.Lock()
				p.kf = newKf
				p.mu.Unlock()
				p.logger.Debug().Msg("JWKS refreshed successfully")
			}
			cancel()
		case <-p.stopCh:
			return
		}
	}
}

func (p *JWKSProvider) Stop() {
	close(p.stopCh)
}

func (p *JWKSProvider) GetKeyfunc() keyfunc.Keyfunc {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.kf
}

func (p *JWKSProvider) VerifyToken(tokenString string, cfg ClerkConfig) (*ClerkClaims, error) {
	claims := &ClerkClaims{}

	kf := p.GetKeyfunc()

	_, err := jwt.ParseWithClaims(tokenString, claims, kf.Keyfunc, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		if errors.Is(err, jwt.ErrTokenMalformed) {
			return nil, ErrTokenMalformed
		}
		return nil, fmt.Errorf("%w: %v", ErrTokenInvalid, err)
	}

	if cfg.Issuer != "" && claims.Issuer != cfg.Issuer {
		return nil, fmt.Errorf("%w: expected %s, got %s", ErrIssuerMismatch, cfg.Issuer, claims.Issuer)
	}

	if cfg.Audience != "" {
		audMatch := false
		for _, aud := range claims.Audience {
			if aud == cfg.Audience {
				audMatch = true
				break
			}
		}
		if !audMatch {
			return nil, fmt.Errorf("%w: expected %s, got %v", ErrAudienceMismatch, cfg.Audience, claims.Audience)
		}
	}

	if claims.Subject == "" {
		return nil, ErrClaimsMissing
	}

	return claims, nil
}

func ExtractBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", ErrMissingAuthHeader
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", ErrInvalidAuthHeader
	}
	return parts[1], nil
}

type ClerkMiddleware struct {
	provider *JWKSProvider
	config   ClerkConfig
}

func NewClerkMiddleware(cfg ClerkConfig) (*ClerkMiddleware, error) {
	provider, err := NewJWKSProvider(cfg)
	if err != nil {
		return nil, err
	}
	return &ClerkMiddleware{
		provider: provider,
		config:   cfg,
	}, nil
}

func (m *ClerkMiddleware) Handler() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			logger := zerolog.Ctx(ctx)

			authHeader := r.Header.Get("Authorization")
			token, err := ExtractBearerToken(authHeader)
			if err != nil {
				logger.Warn().Err(err).Msg("auth header error")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := m.provider.VerifyToken(token, m.config)
			if err != nil {
				logger.Warn().Err(err).Msg("token verification failed")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			userID := claims.InternalUserID()
			orgID := claims.InternalOrgID()

			ctx = context.WithValue(ctx, UserIDKey, userID)
			ctx = context.WithValue(ctx, OrgIDKey, orgID)
			ctx = context.WithValue(ctx, ClaimsKey, claims)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role())

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func (m *ClerkMiddleware) FiberHandler() func(c *fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		token, err := ExtractBearerToken(authHeader)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized", "code": "unauthorized"})
		}

		claims, err := m.provider.VerifyToken(token, m.config)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized", "code": "unauthorized"})
		}

		userID := claims.InternalUserID()
		orgID := claims.InternalOrgID()

		c.Locals("user_id", userID)
		c.Locals("org_id", orgID)
		c.Locals("clerk_user_id", claims.UserID)
		c.Locals("role", claims.Role())
		c.Locals("org_role", claims.OrgRole)
		c.Locals("coach_id", claims.CoachID())
		c.Locals("email", claims.Email)
		c.Locals("claims", claims)

		return c.Next()
	}
}

func (m *ClerkMiddleware) Stop() {
	m.provider.Stop()
}

type contextKey string

const (
	UserIDKey    contextKey = "user_id"
	OrgIDKey     contextKey = "org_id"
	ClaimsKey    contextKey = "claims"
	UserRoleKey  contextKey = "role"
)

func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return id, ok
}

func GetOrgID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(OrgIDKey).(uuid.UUID)
	return id, ok
}

func GetClaims(ctx context.Context) (*ClerkClaims, bool) {
	c, ok := ctx.Value(ClaimsKey).(*ClerkClaims)
	return c, ok
}

func GetUserRole(ctx context.Context) (string, bool) {
	r, ok := ctx.Value(UserRoleKey).(string)
	return r, ok
}
