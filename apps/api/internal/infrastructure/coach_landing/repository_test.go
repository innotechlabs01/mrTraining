package coach_landing

import (
	"context"
	"database/sql"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_landing"
)

// dsnFromEnv devuelve el DSN de pruebas desde DATABASE_URL, o vacío si no hay
// base de datos de pruebas disponible. Los tests que la necesitan hacen t.Skip.
func dsnFromEnv() string {
	v, _ := os.LookupEnv("DATABASE_URL")
	return v
}

// pruebaConexionDisponible reporta si hay una Postgres de pruebas accesible.
func pruebaConexionDisponible(t *testing.T) bool {
	t.Helper()
	return dsnFromEnv() != ""
}

// TestRepo_RLS_CoachIsolation verifica que RLS aísla landings de distintos
// coaches a nivel de base de datos. Requiere Postgres con las migraciones
// 416 y 417 aplicadas.
func TestRepo_RLS_CoachIsolation(t *testing.T) {
	if !pruebaConexionDisponible(t) {
		t.Skip("DATABASE_URL no configurada: prueba de integración coach_landing omitida")
	}

	db, err := sql.Open("pgx", dsnFromEnv())
	require.NoError(t, err)
	defer db.Close()

	repo := NewRepository(db)
	ctx := context.Background()

	coachA := "coach-a-rls-" + uuid.NewString()[:8]
	coachB := "coach-b-rls-" + uuid.NewString()[:8]

	// Asegura que los coaches existan en la tabla coaches (FK)
	_, err = db.ExecContext(ctx, `
		INSERT INTO coaches (id, email, name, is_active, created_at, updated_at)
		VALUES ($1, $2, 'Coach A', 1, NOW(), NOW()),
		       ($3, $4, 'Coach B', 1, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, coachA, coachA+"@example.com", coachB, coachB+"@example.com")
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM coach_landing_pages WHERE coach_id IN ($1, $2)`, coachA, coachB)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM coaches WHERE id IN ($1, $2)`, coachA, coachB)
	})

	// Crea landings no publicadas (la policy pública solo expone publicadas).
	lpA := &domain.LandingPage{CoachID: coachA, Slug: "landing-a", Title: "A", Config: "{}", Sections: "[]", Images: "[]", IsPublished: false}
	lpB := &domain.LandingPage{CoachID: coachB, Slug: "landing-b", Title: "B", Config: "{}", Sections: "[]", Images: "[]", IsPublished: false}
	require.NoError(t, repo.Create(ctx, lpA))
	require.NoError(t, repo.Create(ctx, lpB))

	// Con contexto de coach A, no debe ver la landing de coach B (RLS).
	_, err = repo.GetByID(ctx, lpB.ID, coachA)
	require.Error(t, err)
	require.Equal(t, domain.ErrNotFound, err)

	// Con contexto de coach A, GetByCoach solo devuelve la suya.
	list, err := repo.GetByCoach(ctx, coachA)
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.Equal(t, lpA.ID, list[0].ID)
}

// TestRepo_RLS_PublicRead_OnlyPublished verifica que, sin contexto de coach,
// solo se pueden leer landings publicadas (policy pública de RLS).
func TestRepo_RLS_PublicRead_OnlyPublished(t *testing.T) {
	if !pruebaConexionDisponible(t) {
		t.Skip("DATABASE_URL no configurada: prueba de integración coach_landing omitida")
	}

	db, err := sql.Open("pgx", dsnFromEnv())
	require.NoError(t, err)
	defer db.Close()

	repo := NewRepository(db)
	ctx := context.Background()

	coachA := "coach-a-rls-public-" + uuid.NewString()[:8]
	_, err = db.ExecContext(ctx, `
		INSERT INTO coaches (id, email, name, is_active, created_at, updated_at)
		VALUES ($1, $2, 'Coach A Public', 1, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, coachA, coachA+"@example.com")
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM coach_landing_pages WHERE coach_id = $1`, coachA)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM coaches WHERE id = $1`, coachA)
	})

	slugPub := "published-rls-" + uuid.NewString()[:8]
	slugUnpub := "unpublished-rls-" + uuid.NewString()[:8]

	lpUnpublished := &domain.LandingPage{CoachID: coachA, Slug: slugUnpub, Title: "No publicada", Config: "{}", Sections: "[]", Images: "[]", IsPublished: false}
	lpPublished := &domain.LandingPage{CoachID: coachA, Slug: slugPub, Title: "Publicada", Config: "{}", Sections: "[]", Images: "[]", IsPublished: true}
	require.NoError(t, repo.Create(ctx, lpUnpublished))
	require.NoError(t, repo.Create(ctx, lpPublished))

	// Sin contexto de coach (GetBySlug usa el pool directo, no setea coach context).
	got, err := repo.GetBySlug(ctx, slugPub)
	require.NoError(t, err)
	require.Equal(t, lpPublished.ID, got.ID)

	got, err = repo.GetBySlug(ctx, slugUnpub)
	require.Error(t, err)
	require.Equal(t, domain.ErrNotFound, err)

	// Slug inexistente.
	_, err = repo.GetBySlug(ctx, "no-existe-rls-"+uuid.New().String())
	require.Error(t, err)
	require.Equal(t, domain.ErrNotFound, err)
}
