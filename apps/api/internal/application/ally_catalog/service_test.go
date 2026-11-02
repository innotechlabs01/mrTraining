package ally_catalog

import (
	"context"
	"errors"
	"os"
	"testing"

	allycatalogdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_catalog"
	allycataloginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_catalog"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func newCatalogTestDB(t *testing.T) (*database.DB, *Service) {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if err := applyCatalogMigrations(t, db); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyA','userA','Legal A','Comercial A','gym','active')`)
	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyB','userB','Legal B','Comercial B','nutrition','active')`)

	repo := allycataloginfra.NewRepository(db.DB)
	return db, NewService(repo)
}

func applyCatalogMigrations(t *testing.T, db *database.DB) error {
	t.Helper()
	ddl := `
CREATE TABLE IF NOT EXISTS allies (
  id TEXT PRIMARY KEY, owner_user_id TEXT, legal_name TEXT NOT NULL, commercial_name TEXT NOT NULL,
  category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  CHECK (status IN ('pending','active','suspended')),
  CHECK (category IN ('gym','nutrition','physio','supplements','recovery','other'))
);
CREATE TABLE IF NOT EXISTS ally_members (
  id TEXT PRIMARY KEY, ally_id TEXT NOT NULL REFERENCES allies(id),
  user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ally_id, user_id),
  CHECK (role IN ('owner','staff'))
);
CREATE TABLE IF NOT EXISTS ally_products (
  id TEXT PRIMARY KEY, ally_id TEXT NOT NULL REFERENCES allies(id),
  name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'COP',
  stock INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (price_cents >= 0), CHECK (stock >= 0), CHECK (currency IN ('COP')), CHECK (active IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_ally_products_ally ON ally_products(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_products_active ON ally_products(ally_id, active);
CREATE TABLE IF NOT EXISTS ally_services (
  id TEXT PRIMARY KEY, ally_id TEXT NOT NULL REFERENCES allies(id),
  name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'COP',
  duration_min INTEGER NOT NULL DEFAULT 0, capacity INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (price_cents >= 0), CHECK (duration_min >= 0), CHECK (capacity >= 1),
  CHECK (currency IN ('COP')), CHECK (active IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_ally_services_ally ON ally_services(ally_id);
CREATE INDEX IF NOT EXISTS idx_ally_services_active ON ally_services(ally_id, active);
`
	_, err := db.Exec(ddl)
	return err
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreateAndListProductsScopedToAlly(t *testing.T) {
	_, svc := newCatalogTestDB(t)
	ctx := context.Background()

	p, err := svc.CreateProduct(ctx, "userA", allycatalogdomain.CreateProductInput{
		Name:        "Proteína",
		Description: "Suplemento",
		PriceCents:  25000,
		Currency:    "COP",
		Stock:       10,
		Active:      true,
	})
	if err != nil {
		t.Fatalf("create product: %v", err)
	}
	if p.AllyID != "allyA" || p.Name != "Proteína" || p.PriceCents != 25000 || !p.Active {
		t.Fatalf("unexpected product: %+v", p)
	}

	list, err := svc.ListProducts(ctx, "userA", false)
	if err != nil {
		t.Fatalf("list products: %v", err)
	}
	if len(list) != 1 || list[0].ID != p.ID {
		t.Fatalf("unexpected list: %+v", list)
	}

	got, err := svc.GetProduct(ctx, "userA", p.ID)
	if err != nil {
		t.Fatalf("get product: %v", err)
	}
	if got.ID != p.ID {
		t.Fatalf("get returned wrong product")
	}
}

func TestUpdateProduct(t *testing.T) {
	_, svc := newCatalogTestDB(t)
	ctx := context.Background()

	p, err := svc.CreateProduct(ctx, "userA", allycatalogdomain.CreateProductInput{
		Name:        "Proteína", PriceCents: 25000, Stock: 10, Active: true,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	updated, err := svc.UpdateProduct(ctx, "userA", p.ID, allycatalogdomain.UpdateProductInput{
		PriceCents: ptrInt64(30000),
		Active:     ptrBool(false),
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.PriceCents != 30000 || updated.Active != false {
		t.Fatalf("update not applied: %+v", updated)
	}
}

func TestServiceCRUD(t *testing.T) {
	_, svc := newCatalogTestDB(t)
	ctx := context.Background()

	s, err := svc.CreateService(ctx, "userB", allycatalogdomain.CreateServiceInput{
		Name:         "Consulta nutricional",
		PriceCents:   40000,
		DurationMin:  60,
		Capacity:     1,
		Active:       true,
	})
	if err != nil {
		t.Fatalf("create service: %v", err)
	}
	if s.AllyID != "allyB" || s.DurationMin != 60 || s.Capacity != 1 {
		t.Fatalf("unexpected service: %+v", s)
	}

	list, err := svc.ListServices(ctx, "userB", false)
	if err != nil {
		t.Fatalf("list services: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 service, got %d", len(list))
	}

	got, err := svc.GetService(ctx, "userB", s.ID)
	if err != nil {
		t.Fatalf("get service: %v", err)
	}
	if got.ID != s.ID {
		t.Fatalf("get returned wrong service")
	}
}

func TestIDOR_ProductBelongsToOtherAlly(t *testing.T) {
	_, svc := newCatalogTestDB(t)
	ctx := context.Background()

	p, err := svc.CreateProduct(ctx, "userA", allycatalogdomain.CreateProductInput{
		Name:        "Producto A", PriceCents: 1000, Stock: 1, Active: true,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if _, err := svc.GetProduct(ctx, "userB", p.ID); err == nil {
		t.Fatal("expected not-found for another ally's product")
	} else if !errors.Is(err, allycatalogdomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	if _, err := svc.UpdateProduct(ctx, "userB", p.ID, allycatalogdomain.UpdateProductInput{Name: ptrString("hack")}); err == nil {
		t.Fatal("expected not-found updating another ally's product")
	} else if !errors.Is(err, allycatalogdomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	list, err := svc.ListProducts(ctx, "userB", false)
	if err != nil {
		t.Fatalf("list userB: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("expected userB to see 0 products, got %d", len(list))
	}
}

func TestResolveAllyID_AmbiguousAndUnknown(t *testing.T) {
	db, _ := newCatalogTestDB(t)
	ctx := context.Background()

	repo := allycataloginfra.NewRepository(db.DB)

	if _, err := repo.ResolveAllyID(ctx, "nobody"); err == nil {
		t.Fatal("expected error for unknown user")
	} else if !errors.Is(err, allycatalogdomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	mustExec(t, db, `INSERT INTO ally_members (id, ally_id, user_id, role) VALUES ('m1','allyB','userA','staff')`)
	if _, err := repo.ResolveAllyID(ctx, "userA"); err == nil {
		t.Fatal("expected ambiguous error for user linked to two allies")
	}
}

func ptrString(s string) *string { return &s }
func ptrInt64(i int64) *int64    { return &i }
func ptrBool(b bool) *bool       { return &b }
