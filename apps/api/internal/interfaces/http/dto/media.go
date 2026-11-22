package dto

// PresignUploadRequest requests a Cloudflare R2 presigned PUT URL.
type PresignUploadRequest struct {
	Purpose     string `json:"purpose"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	SizeBytes   int64  `json:"size_bytes"`
	ResourceID  string `json:"resource_id,omitempty"`
}

// ConfirmUploadRequest verifies an uploaded R2 object and marks it ready.
type ConfirmUploadRequest struct {
	MediaID   string `json:"media_id,omitempty"`
	ObjectKey string `json:"object_key,omitempty"`
}

// PresignReadRequest requests short-lived signed GET URLs for canonical r2:// refs.
type PresignReadRequest struct {
	Refs []string `json:"refs"`
}
