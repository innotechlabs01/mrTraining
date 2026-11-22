// Package mediautil provides shared media validation utilities (MIME types,
// extensions, and magic-byte header verification) used across HTTP handlers and
// Cloudflare R2 upload confirmation.
package mediautil

import (
	"bytes"
	"errors"
	"io"
	"path/filepath"
	"strings"
)

// mediaMagicBytes maps lowercase file extensions to expected leading byte
// signatures (or offset-4 "ftyp" for MP4/MOV/M4V).
var mediaMagicBytes = map[string][][]byte{
	".jpg":  {{0xFF, 0xD8, 0xFF}},
	".jpeg": {{0xFF, 0xD8, 0xFF}},
	".png":  {{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}},
	".gif":  {{0x47, 0x49, 0x46, 0x38, 0x37, 0x61}, {0x47, 0x49, 0x46, 0x38, 0x39, 0x61}},
	".webp": {{0x52, 0x49, 0x46, 0x46}}, // RIFF....WEBP checked below
	".mp4":  {{0x66, 0x74, 0x79, 0x70}}, // "ftyp" at offset 4
	".mov":  {{0x66, 0x74, 0x79, 0x70}}, // "ftyp" at offset 4
	".m4v":  {{0x66, 0x74, 0x79, 0x70}}, // "ftyp" at offset 4
	".webm": {{0x1A, 0x45, 0xDF, 0xA3}}, // EBML
}

// AllowedImageMIMEs maps allowed image MIME types to canonical extensions.
var AllowedImageMIMEs = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// AllowedVideoMIMEs maps allowed video MIME types to canonical extensions.
var AllowedVideoMIMEs = map[string]string{
	"video/mp4":       ".mp4",
	"video/quicktime": ".mov",
	"video/webm":      ".webm",
	"video/x-m4v":     ".m4v",
}

// IsImageMIME reports whether contentType is an allowed image MIME type.
func IsImageMIME(contentType string) bool {
	_, ok := AllowedImageMIMEs[normalizeMIME(contentType)]
	return ok
}

// IsVideoMIME reports whether contentType is an allowed video MIME type.
func IsVideoMIME(contentType string) bool {
	_, ok := AllowedVideoMIMEs[normalizeMIME(contentType)]
	return ok
}

// CanonicalExtForMIME returns the canonical lowercase extension (including dot)
// for a supported image or video MIME type.
func CanonicalExtForMIME(contentType string) (string, bool) {
	ct := normalizeMIME(contentType)
	if ext, ok := AllowedImageMIMEs[ct]; ok {
		return ext, true
	}
	if ext, ok := AllowedVideoMIMEs[ct]; ok {
		return ext, true
	}
	return "", false
}

// ExtMatchesMIME verifies that an optional filename extension is compatible
// with the declared MIME type (if the filename has an extension).
func ExtMatchesMIME(filename, contentType string) bool {
	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(filename)))
	if ext == "" {
		return true
	}
	ct := normalizeMIME(contentType)
	switch ct {
	case "image/jpeg", "image/jpg":
		return ext == ".jpg" || ext == ".jpeg"
	case "image/png":
		return ext == ".png"
	case "image/webp":
		return ext == ".webp"
	case "image/gif":
		return ext == ".gif"
	case "video/mp4":
		return ext == ".mp4" || ext == ".m4v"
	case "video/quicktime":
		return ext == ".mov"
	case "video/webm":
		return ext == ".webm"
	case "video/x-m4v":
		return ext == ".m4v" || ext == ".mp4"
	default:
		return false
	}
}

func normalizeMIME(ct string) string {
	if idx := strings.IndexByte(ct, ';'); idx >= 0 {
		ct = ct[:idx]
	}
	return strings.ToLower(strings.TrimSpace(ct))
}

// ValidateMagicBytes checks the leading bytes read from content against the
// expected signature for ext (e.g. ".jpg", ".mp4").
func ValidateMagicBytes(content io.Reader, ext string) error {
	ext = strings.ToLower(strings.TrimSpace(ext))
	if _, ok := mediaMagicBytes[ext]; !ok {
		return errors.New("extensión de archivo no soportada")
	}

	header := make([]byte, 512)
	n, err := io.ReadFull(content, header)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return err
	}
	header = header[:n]
	return ValidateMagicHeaderBytes(header, ext)
}

// ValidateMagicHeaderBytes checks an already-read header slice against the
// expected signature for ext.
func ValidateMagicHeaderBytes(header []byte, ext string) error {
	ext = strings.ToLower(strings.TrimSpace(ext))
	signatures, ok := mediaMagicBytes[ext]
	if !ok {
		return errors.New("extensión de archivo no soportada")
	}

	if ext == ".webp" {
		if len(header) >= 12 && bytes.Equal(header[0:4], []byte("RIFF")) && bytes.Equal(header[8:12], []byte("WEBP")) {
			return nil
		}
		return errors.New("el contenido del archivo no coincide con su extensión")
	}

	if ext == ".mp4" || ext == ".mov" || ext == ".m4v" {
		if len(header) >= 8 && bytes.Equal(header[4:8], []byte("ftyp")) {
			return nil
		}
		return errors.New("el contenido del archivo no coincide con su extensión")
	}

	for _, sig := range signatures {
		if len(header) >= len(sig) && bytes.Equal(header[:len(sig)], sig) {
			return nil
		}
	}
	return errors.New("el contenido del archivo no coincide con su extensión")
}
