// Package handlers - landing page content for the public site.
//
// The public landing renders a single global page whose content lives in the
// `landing_content` table (JSON blob, versioned rows). Flow:
//   - GET /public/landing      -> latest version (anonymous visitors)
//   - GET /api/v1/landing      -> latest version (coach editor)
//   - PUT /api/v1/landing      -> save + publish new version (coach)
//   - POST /api/v1/landing/media -> upload image/video asset to /uploads/landing (coach)
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// LandingData mirrors the web LandingData contract
// (apps/web/src/components/landing/data.ts). Content is stored as JSON in
// landing_content.content; the struct below is the transport contract.
type LandingData struct {
	Version      int                `json:"version"`
	NavLinks     []string           `json:"navLinks"`
	Brand        LandingBrand       `json:"brand"`
	Stats        []LandingStat      `json:"stats"`
	Reasons      []LandingSection   `json:"reasons"`
	Trainers     []LandingTrainer   `json:"trainers"`
	Testimonials []LandingTestimony `json:"testimonials"`
	Tienda       LandingSection     `json:"tienda"`
	Blog         LandingHead        `json:"blog"`
	Plans        LandingHead        `json:"plans"`
	Asesoria     LandingHead        `json:"asesoria"`
	UpdatedAt    string             `json:"updatedAt"`
}

type LandingBrand struct {
	Colors        LandingColors  `json:"colors"`
	Font          string         `json:"font"`
	HeroMedia     string         `json:"heroMedia"` // image or video URL; empty = use heroPhoto
	HeroPhoto     string         `json:"heroPhoto"`
	HeroPhotoAlt  string         `json:"heroPhotoAlt"`
	HeroSubtitle  string         `json:"heroSubtitle"`
	AboutTitle    string         `json:"aboutTitle"`
	AboutPhoto    string         `json:"aboutPhoto"`
	AboutPhotoAlt string         `json:"aboutPhotoAlt"`
	AboutCopy     []string       `json:"aboutCopy"`
	Contact       LandingContact `json:"contact"`
}

type LandingColors struct {
	Primary string `json:"primary"`
}

type LandingContact struct {
	Whatsapp    string       `json:"whatsapp"`
	Email       string       `json:"email"`
	City        string       `json:"city"`
	SocialLinks []SocialLink `json:"socialLinks"`
}

type SocialLink struct {
	Label string `json:"label"`
	Href  string `json:"href"`
	Icon  string `json:"icon"`
}

type LandingStat struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type LandingSection struct {
	N     string `json:"n,omitempty"`
	Title string `json:"title"`
	Copy  string `json:"copy"`
}

type LandingTrainer struct {
	Name  string `json:"name"`
	Seed  string `json:"seed,omitempty"`  // legacy picsum seed
	Photo string `json:"photo,omitempty"` // uploaded image URL
}

type LandingTestimony struct {
	Quote string `json:"quote"`
	Name  string `json:"name"`
	Seed  string `json:"seed,omitempty"`
	Photo string `json:"photo,omitempty"`
}

type LandingHead struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Copy     string `json:"copy,omitempty"`
}

const landingTable = "landing_content"

// HandlerGetLanding returns the latest published landing content.
func HandlerGetLanding(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var content string
		var version int
		err := db.QueryRow(
			`SELECT content, version FROM `+landingTable+` ORDER BY version DESC LIMIT 1`,
		).Scan(&content, &version)
		if err != nil {
			// No rows (or table missing pre-migration): serve defaults.
			return c.JSON(getDefaultLandingData())
		}
		var data LandingData
		if err := json.Unmarshal([]byte(content), &data); err != nil {
			log.Printf("landing: parse error: %v", err)
			return c.JSON(getDefaultLandingData())
		}
		data.Version = version
		data = withLandingDefaults(data)
		return c.JSON(data)
	}
}

// withLandingDefaults fills missing fields from defaults so rows saved by the
// legacy shape (no brand/contact/section headings) still render correctly.
func withLandingDefaults(d LandingData) LandingData {
	def := getDefaultLandingData()
	if d.Brand.Colors.Primary == "" {
		d.Brand.Colors.Primary = def.Brand.Colors.Primary
	}
	if d.Brand.HeroSubtitle == "" {
		d.Brand.HeroSubtitle = def.Brand.HeroSubtitle
	}
	if d.Brand.Font == "" {
		d.Brand.Font = def.Brand.Font
	}
	if len(d.Brand.AboutCopy) == 0 {
		d.Brand.AboutCopy = def.Brand.AboutCopy
	}
	if d.Brand.Contact.Whatsapp == "" {
		d.Brand.Contact = def.Brand.Contact
	}
	if len(d.NavLinks) == 0 {
		d.NavLinks = def.NavLinks
	}
	if len(d.Stats) == 0 {
		d.Stats = def.Stats
	}
	if len(d.Reasons) == 0 {
		d.Reasons = def.Reasons
	}
	if len(d.Testimonials) == 0 {
		d.Testimonials = def.Testimonials
	}
	if d.Tienda.Title == "" {
		d.Tienda = def.Tienda
	}
	if d.Blog.Title == "" {
		d.Blog = def.Blog
	}
	if d.Plans.Title == "" {
		d.Plans = def.Plans
	}
	if d.Asesoria.Title == "" {
		d.Asesoria = def.Asesoria
	}
	return d
}

// HandlerPutLanding saves a new version and publishes it immediately.
func HandlerPutLanding(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var data LandingData
		if err := c.BodyParser(&data); err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
		}

		data.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		content, err := json.Marshal(data)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to serialize content")
		}

		var version int
		_ = db.QueryRow(`SELECT COALESCE(MAX(version), 0) FROM ` + landingTable).Scan(&version)
		version++

		if _, err := db.Exec(
			`INSERT INTO `+landingTable+` (version, content, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
			version, string(content),
		); err != nil {
			log.Printf("landing: insert error: %v", err)
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save content")
		}

		middleware.InvalidateCache("landing")
		return c.JSON(fiber.Map{
			"message": "landing published",
			"version": version,
		})
	}
}

var landingAllowedExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true,
	".mp4": true, ".mov": true, ".webm": true,
}

// landingMediaExt validates an uploaded asset extension (image or video).
func landingMediaExt(filename string) (string, bool) {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext, landingAllowedExt[ext]
}

// HandlerUploadLandingMedia stores an image or video under /uploads/landing
// (served by the static middleware) and returns its public URL.
func HandlerUploadLandingMedia() fiber.Handler {
	return func(c *fiber.Ctx) error {
		file, err := c.FormFile("file")
		if err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "file is required")
		}
		ext, ok := landingMediaExt(file.Filename)
		if !ok {
			return appresponse.Error(c, fiber.StatusBadRequest, "unsupported file type: use an image or video (jpg, png, webp, gif, mp4, mov, webm)")
		}

		filename := "landing-" + time.Now().UTC().Format("20060102150405") +
			"-" + sanitizePathSegment(strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename))) + ext
		dir := "uploads/landing"
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to create upload dir")
		}
		if err := c.SaveFile(file, filepath.Join(dir, filename)); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save file")
		}

		return c.JSON(fiber.Map{"url": "/uploads/landing/" + filename})
	}
}

// sanitizePathSegment is declared in formrecording.go (same package) and reused here.

// getDefaultLandingData returns the default landing content (matches web fallbacks).
func getDefaultLandingData() LandingData {
	return LandingData{
		Version:  1,
		NavLinks: []string{"Inicio", "Sobre MAO", "Asesoría Online", "Planes", "Testimonios", "Tienda", "Blog", "Contacto"},
		Brand: LandingBrand{
			Colors:        LandingColors{Primary: "#15aaf2"},
			Font:          "Oswald, var(--font-display)",
			HeroSubtitle:  "Transforma tu fuerza en disciplina, tu disciplina en resultado.",
			HeroPhoto:     "",
			HeroPhotoAlt:  "Mao levantando una barra",
			AboutTitle:    "Sobre Mao Restrepo",
			AboutPhoto:    "",
			AboutPhotoAlt: "Mao entrenando a un atleta",
			AboutCopy: []string{
				"Soy Mao Restrepo — entrenador online con más de 8 años de experiencia preparando atletas para fuerza, resistencia y transformación física.",
			},
			Contact: LandingContact{
				Whatsapp: "https://wa.me/5215512345678",
				Email:    "mao@mrtraining.com",
				City:     "Ciudad de México, México",
				SocialLinks: []SocialLink{
					{Label: "Instagram", Href: "https://instagram.com/", Icon: "instagram"},
					{Label: "YouTube", Href: "https://youtube.com/", Icon: "youtube"},
				},
			},
		},
		Stats: []LandingStat{
			{Value: "12K+", Label: "Horas de Entrenamiento"},
			{Value: "8+", Label: "Años de Experiencia"},
			{Value: "300+", Label: "Atletas Transformados"},
		},
		Reasons: []LandingSection{
			{N: "01", Title: "Programación a Medida", Copy: "Cada plan se escribe para ti: objetivos, historial, horarios y limitaciones."},
			{N: "02", Title: "Feedback en Tiempo Real", Copy: "Revisamos tus sesiones vía video, ajustamos cargas y corregimos técnica cada semana."},
			{N: "03", Title: "Seguimiento Nutricional", Copy: "Macros claros, sin restricciones extrema. Planes que caben en tu rutina."},
			{N: "04", Title: "Comunidad de Resultados", Copy: "Una comunidad privada de atletas que ya transformaron su cuerpo."},
		},
		Trainers: []LandingTrainer{{Name: "Mao Restrepo", Seed: "ig-trainer-1"}},
		Testimonials: []LandingTestimony{
			{Quote: "En 12 semanas subí 18 kg a mi press de banca y aprendí a comer sin pasar hambre.", Name: "Andrés R.", Seed: "ig-testi-1"},
			{Quote: "Vine sin saber levantar una pesa. Ahora marqué mi primera competencia de powerlifting.", Name: "Valeria M.", Seed: "ig-testi-2"},
			{Quote: "Mao no te deja fallar. Si una semana te fue mal, ya es lunes y ajusta todo.", Name: "Luis F.", Seed: "ig-testi-3"},
		},
		Tienda:    LandingSection{Title: "Tienda", Copy: "Accesorios y suplementos que uso y recomiendo en mis entrenamientos."},
		Blog:      LandingHead{Title: "Blog", Subtitle: "Técnicas, progresos y lecciones detrás del proceso."},
		Plans:     LandingHead{Title: "Planes", Subtitle: "Elige el acompañamiento que se ajuste a tu nivel y objetivo."},
		Asesoria:  LandingHead{Title: "Asesoría Online", Subtitle: "Tu entrenamiento puede tener dirección, estés donde estés."},
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}
