package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

// LandingData represents the structure of the landing page content.
type LandingData struct {
	Version       int    `json:"version"`
	DraftVersion  int    `json:"draft_version"` // Para preview - versión en borrador
	IsStatic      bool   `json:"is_static"`    // Si es contenido estático (hardcoded)
	NavLinks      []string `json:"navLinks"`
	Stats         []Stat `json:"stats"`
	Reasons       []Reason `json:"reasons"`
	Trainers      []Trainer `json:"trainers"`
	Testimonials  []Testimonial `json:"testimonials"`
	UpdatedAt     string `json:"updatedAt"`
	PublishedAt   string `json:"published_at"`
}

type Stat struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type Reason struct {
	N      string `json:"n"`
	Title  string `json:"title"`
	Copy   string `json:"copy"`
}

type Trainer struct {
	Name    string `json:"name"`
	Seed    string `json:"seed"`
}

type Testimonial struct {
	Quote   string `json:"quote"`
	Name    string `json:"name"`
	Seed    string `json:"seed"`
}

// HandlerGetLanding returns a fiber.Handler that handles GET /api/v1/landing.
func HandlerGetLanding(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Query the landing content (id = 1 is the only row)
		var isStatic bool
		var draftVersion int
		var isPublished bool
		var publishedAt string
		var content string
		err := db.QueryRow(`
			SELECT content, is_static, draft_version, is_published, published_at 
			FROM landing_content WHERE id = 1
		`).Scan(&content, &isStatic, &draftVersion, &isPublished, &publishedAt)

		if err != nil {
			// If no content exists, return default structure
			defaultData := getDefaultLandingData()
			data, _ := json.Marshal(defaultData)
			return c.JSON(string(data))
		}

		// Parse the JSON content
		var data LandingData
		if err := json.Unmarshal([]byte(content), &data); err != nil {
			log.Printf("JSON parse error: %v", err)
			return c.JSON("invalid content format")
		}

		// Asegurar valores por defecto si son nulos
		if data.DraftVersion == 0 {
			data.DraftVersion = draftVersion
		}
		if !data.IsStatic {
			data.IsStatic = isStatic
		}

		return c.JSON(data)
	}
}

// HandlerPutLanding returns a fiber.Handler that handles PUT /api/v1/landing.
func HandlerPutLanding(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var data LandingData
		if err := c.BodyParser(&data); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
		}

		// Marshal to JSON
		content, err := json.Marshal(data)
		if err != nil {
			log.Printf("JSON marshal error: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to serialize content"})
		}

		// Si IsStatic es true, siempre actualizamos la versión principal
		// Si IsStatic es false, usamos draft_version para preview/publish
		var versionToSave int
		var isPublish bool

		if data.IsStatic {
			// Contenido estático: version principal siempre se actualiza
			versionToSave = data.Version
			isPublish = true
		} else {
			// Contenido dinámico: comparar draftVersion con version
			// Si draftVersion > version, es un preview
			// Si draftVersion <= version, es un publish
			versionToSave = data.DraftVersion
			isPublish = data.DraftVersion <= data.Version
		}

		// Update the landing content
		_, err =  db.Exec(
			`INSERT INTO landing_content (id, version, draft_version, is_static, content, updated_at, is_published, published_at) 
			 VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP, 
			  CASE WHEN ? THEN 1 ELSE 0 END, 
			  CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)`,
			versionToSave, data.DraftVersion, data.IsStatic, string(content),
			isPublish, isPublish,
		)
		if err != nil {
			log.Printf("Database update error: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save content"})
		}

		// Si es un publish definitivo, marcamos el registro
		if isPublish {
			db.Exec(`UPDATE landing_content SET is_published = true, published_at = CURRENT_TIMESTAMP WHERE id = 1`)
		}

		return c.JSON(fiber.Map{
			"message":     "Landing content updated successfully",
			"version":     versionToSave,
			"draft":       data.DraftVersion,
			"is_published": isPublish,
		})
	}
}

// getDefaultLandingData returns the default landing content structure.
func getDefaultLandingData() LandingData {
	return LandingData{
		Version:       1,
		DraftVersion:  1,
		IsStatic:      true, // Por defecto es contenido estático
		NavLinks: []string{
			"Home", "Service", "Trainers", "Testimonial", "Coaching", "Contact Us",
		},
		Stats: []Stat{
			{Value: "20+", Label: "Years of Experience"},
			{Value: "15K+", Label: "Members Join"},
			{Value: "14K+", Label: "Happy Members"},
		},
		Reasons: []Reason{
			{N: "01", Title: "Personal Training", Copy: "Our gyms offer personalized training sessions with certified personal trainers who create custom workout plans based on your goals."},
			{N: "02", Title: "Equipment and Facilities", Copy: "Full racks, free weights, and cardio machines, serviced year-round and updated as soon as something wears out."},
			{N: "03", Title: "Nutrition Counseling", Copy: "One-on-one nutrition guidance that fits your training block, not a generic sheet handed out at sign-up."},
			{N: "04", Title: "Speciality Programs", Copy: "Powerlifting, bodybuilding prep, and sport-specific conditioning blocks run by coaches who compete themselves."},
		},
		Trainers: []Trainer{
			{Name: "Borney Exiteid", Seed: "ig-trainer-1"},
			{Name: "Elsa Windia", Seed: "ig-trainer-2"},
			{Name: "Georege Aryo", Seed: "ig-trainer-3"},
			{Name: "Mika Thornton", Seed: "ig-trainer-4"},
			{Name: "Priya Sharma", Seed: "ig-trainer-5"},
		},
		Testimonials: []Testimonial{
			{Quote: "I am extremely grateful for the positive impact gym training has had on my life; through consistent training and expert guidance from coaches, I've witnessed a remarkable transformation in strength, endurance, and overall fitness.", Name: "Jhony Breaker", Seed: "ig-testi-1"},
			{Quote: "The coaches here don't let you coast. Every session has a plan, and every plan gets adjusted based on how last week actually went.", Name: "Maria Ortiz", Seed: "ig-testi-2"},
			{Quote: "Six months ago I couldn't do a single pull-up. The specialty program got me to five clean reps, and I'm still counting.", Name: "Dev Patel", Seed: "ig-testi-3"},
		},
		UpdatedAt: time.Now().Format("2006-01-02T15:04:05Z"),
	}
}