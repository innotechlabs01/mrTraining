package handlers

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateMediaMagicBytes(t *testing.T) {
	tests := []struct {
		name   string
		ext    string
		header []byte
		wantOK bool
	}{
		{"jpeg válido", ".jpg", []byte{0xFF, 0xD8, 0xFF, 0x00}, true},
		{"jpeg válido (2 bytes)", ".jpeg", []byte{0xFF, 0xD8, 0xFF}, true},
		{"png válido", ".png", []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, true},
		{"gif87a válido", ".gif", []byte{0x47, 0x49, 0x46, 0x38, 0x37, 0x61}, true},
		{"gif89a válido", ".gif", []byte{0x47, 0x49, 0x46, 0x38, 0x39, 0x61}, true},
		{"webp válido", ".webp", append([]byte{0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00}, []byte{0x57, 0x45, 0x42, 0x50}...), true},
		{"mp4 válido (ftyp en offset 4)", ".mp4", []byte{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70}, true},
		{"mov válido (ftyp en offset 4)", ".mov", []byte{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70}, true},
		{"webm válido (EBML)", ".webm", []byte{0x1A, 0x45, 0xDF, 0xA3}, true},
		{"jpeg inválido", ".jpg", []byte{0x00, 0x00, 0x00, 0x00}, false},
		{"png inválido", ".png", []byte{0xFF, 0xD8, 0xFF}, false},
		{"ejecutable disfrazado de jpg", ".jpg", []byte("MZ\x90\x00"), false},
		{"extensión no soportada", ".exe", []byte{0x4D, 0x5A}, false},
		{"vacío", ".jpg", []byte{}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMediaMagicBytes(bytes.NewReader(tt.header), tt.ext)
			if tt.wantOK {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
			}
		})
	}
}

func TestLandingMaxMediaSize(t *testing.T) {
	require.Equal(t, int64(10*1024*1024), landingMaxMediaSize(".jpg"))
	require.Equal(t, int64(10*1024*1024), landingMaxMediaSize(".png"))
	require.Equal(t, int64(10*1024*1024), landingMaxMediaSize(".gif"))
	require.Equal(t, int64(10*1024*1024), landingMaxMediaSize(".webp"))
	require.Equal(t, int64(100*1024*1024), landingMaxMediaSize(".mp4"))
	require.Equal(t, int64(100*1024*1024), landingMaxMediaSize(".mov"))
	require.Equal(t, int64(100*1024*1024), landingMaxMediaSize(".webm"))
}
