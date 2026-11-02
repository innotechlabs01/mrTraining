package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestLandingMediaExt(t *testing.T) {
	valid := []string{"photo.JPG", "img.png", "clip.mp4", "clip.mov", "clip.webm", "pic.webp", "anim.gif"}
	for _, f := range valid {
		if _, ok := landingMediaExt(f); !ok {
			t.Errorf("expected %q accepted", f)
		}
	}
	invalid := []string{"doc.pdf", "archive.zip", "exec.sh", "noext", "img.tiff"}
	for _, f := range invalid {
		if _, ok := landingMediaExt(f); ok {
			t.Errorf("expected %q rejected", f)
		}
	}
}

func TestHandlerUploadLandingMedia_InvalidType(t *testing.T) {
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	fw, _ := w.CreateFormFile("file", "evil.exe")
	_, _ = fw.Write([]byte("x"))
	_ = w.Close()

	app := fiber.New()
	app.Post("/upload", HandlerUploadLandingMedia())

	req := httptest.NewRequest("POST", "/upload", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Errorf("expected 400 for .exe upload, got %d", res.StatusCode)
	}
}

func TestHandlerUploadLandingMedia_SavesImage(t *testing.T) {
	tmp := t.TempDir()
	cwd, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(cwd) })
	if err := os.Chdir(tmp); err != nil {
		t.Fatalf("chdir: %v", err)
	}

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	fw, _ := w.CreateFormFile("file", "Hero Banner.PNG")
	_, _ = fw.Write([]byte("fakepng"))
	_ = w.Close()

	app := fiber.New()
	app.Post("/upload", HandlerUploadLandingMedia())

	req := httptest.NewRequest("POST", "/upload", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	resBody, _ := io.ReadAll(res.Body)
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.StatusCode, resBody)
	}
	var out struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(resBody, &out); err != nil {
		t.Fatalf("bad json: %v", err)
	}
	fname := filepath.Base(out.URL)
	if fname == "" || fname == "." {
		t.Fatalf("no filename in url %q", out.URL)
	}
	if _, err := os.Stat(filepath.Join(tmp, "uploads", "landing", fname)); err != nil {
		t.Errorf("file not saved: %v", err)
	}
}
