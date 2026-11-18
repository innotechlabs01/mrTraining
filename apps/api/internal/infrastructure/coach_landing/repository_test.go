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
		t.Skip("DATABASE_URL no configurada: prueba de integración RLS omitida")
	}

	db, err := sql.Open("pgx", dsnFromEnv())
	require.NoError(t, err)
	defer db.Close()

	repo := NewRepository(db)
	ctx := context.Background()

	coachA := "coach-a-rls"
	coachB := "coach-b-rls"

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
		t.Skip("DATABASE_URL no configurada: prueba de integración RLS omitida")
	}

	db, err := sql.Open("pgx", dsnFromEnv())
	require.NoError(t, err)
	defer db.Close()

	repo := NewRepository(db)
	ctx := context.Background()

	coachA := "coach-a-rls-public"
	lpUnpublished := &domain.LandingPage{CoachID: coachA, Slug: "unpublished-rls", Title: "No publicada", Config: "{}", Sections: "[]", Images: "[]", IsPublished: false}
	lpPublished := &domain.LandingPage{CoachID: coachA, Slug: "published-rls", Title: "Publicada", Config: "{}", Sections: "[]", Images: "[]", IsPublished: true}
	require.NoError(t, repo.Create(ctx, lpUnpublished))
	require.NoError(t, repo.Create(ctx, lpPublished))

	// Sin contexto de coach (GetBySlug usa el pool directo, no setea coach context).
	got, err := repo.GetBySlug(ctx, "published-rls")
	require.NoError(t, err)
	require.Equal(t, lpPublished.ID, got.ID)

	got, err = repo.GetBySlug(ctx, "unpublished-rls")
	require.Error(t, err)
	require.Equal(t, domain.ErrNotFound, err)

	// Slug inexistente.
	_, err = repo.GetBySlug(ctx, "no-existe-rls-"+uuid.New().String())
	require.Error(t, err)
	require.Equal(t, domain.ErrNotFound, err)
}
