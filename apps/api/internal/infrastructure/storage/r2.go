// Package storage provides object storage adapters (Cloudflare R2 via S3-compatible API).
package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/innotechlabs01/mr-training-api/internal/config"
)

// ErrStorageNotConfigured is returned when R2 credentials/bucket are missing.
var ErrStorageNotConfigured = errors.New("cloudflare R2 storage is not configured")

// ObjectMeta holds metadata returned by HeadObject.
type ObjectMeta struct {
	ContentLength int64
	ContentType   string
	ETag          string
}

// ObjectStorage defines the operations required for presigned uploads/downloads
// and server-side verification on Cloudflare R2.
type ObjectStorage interface {
	Enabled() bool
	Bucket() string
	PresignPut(ctx context.Context, key, contentType string, ttl time.Duration) (string, error)
	PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error)
	HeadObject(ctx context.Context, key string) (*ObjectMeta, error)
	GetObjectRange(ctx context.Context, key string, start, end int64) ([]byte, error)
	PutObject(ctx context.Context, key, contentType string, body io.Reader, size int64) error
	DeleteObject(ctx context.Context, key string) error
}

// R2Client implements ObjectStorage against Cloudflare R2 using AWS SDK v2 S3.
type R2Client struct {
	bucket  string
	client  *s3.Client
	presign *s3.PresignClient
}

// NewR2Client constructs an R2Client from application config.
// When R2 credentials or bucket are missing, it returns a disabled client
// (Enabled() == false) so non-media routes and local dev without R2 still boot.
func NewR2Client(cfg *config.Config) *R2Client {
	if cfg == nil || cfg.R2AccessKeyID == "" || cfg.R2SecretAccessKey == "" || cfg.R2Bucket == "" {
		return &R2Client{}
	}
	endpoint := strings.TrimRight(cfg.R2Endpoint, "/")
	if endpoint == "" {
		if cfg.R2AccountID == "" {
			return &R2Client{}
		}
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID)
	}

	awsCfg := aws.Config{
		Region: "auto",
		Credentials: aws.NewCredentialsCache(
			credentials.NewStaticCredentialsProvider(cfg.R2AccessKeyID, cfg.R2SecretAccessKey, ""),
		),
		// Required for Cloudflare R2 presigned browser PUTs so SDK does not inject
		// unsupported x-amz-checksum-* headers or fail response validation.
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired,
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	return &R2Client{
		bucket:  cfg.R2Bucket,
		client:  client,
		presign: s3.NewPresignClient(client),
	}
}

// Enabled reports whether R2 credentials and bucket are configured.
func (c *R2Client) Enabled() bool {
	return c != nil && c.client != nil && c.presign != nil && c.bucket != ""
}

// Bucket returns the configured R2 bucket name.
func (c *R2Client) Bucket() string {
	if c == nil {
		return ""
	}
	return c.bucket
}

// PresignPut generates a time-limited SigV4 PUT URL for direct client-to-R2 upload.
func (c *R2Client) PresignPut(ctx context.Context, key, contentType string, ttl time.Duration) (string, error) {
	if !c.Enabled() {
		return "", ErrStorageNotConfigured
	}
	out, err := c.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("presign put object: %w", err)
	}
	return out.URL, nil
}

// PresignGet generates a time-limited SigV4 GET URL for authenticated read/streaming.
func (c *R2Client) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if !c.Enabled() {
		return "", ErrStorageNotConfigured
	}
	out, err := c.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("presign get object: %w", err)
	}
	return out.URL, nil
}

// HeadObject inspects object size and content type in R2 without downloading it.
func (c *R2Client) HeadObject(ctx context.Context, key string) (*ObjectMeta, error) {
	if !c.Enabled() {
		return nil, ErrStorageNotConfigured
	}
	out, err := c.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("head object: %w", err)
	}
	return &ObjectMeta{
		ContentLength: aws.ToInt64(out.ContentLength),
		ContentType:   aws.ToString(out.ContentType),
		ETag:          strings.Trim(aws.ToString(out.ETag), "\""),
	}, nil
}

// GetObjectRange downloads a small byte range (e.g. 0..511) for magic-byte verification.
func (c *R2Client) GetObjectRange(ctx context.Context, key string, start, end int64) ([]byte, error) {
	if !c.Enabled() {
		return nil, ErrStorageNotConfigured
	}
	rng := fmt.Sprintf("bytes=%d-%d", start, end)
	out, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
		Range:  aws.String(rng),
	})
	if err != nil {
		return nil, fmt.Errorf("get object range: %w", err)
	}
	defer out.Body.Close()
	data, err := io.ReadAll(io.LimitReader(out.Body, (end-start)+1024))
	if err != nil {
		return nil, fmt.Errorf("read object range: %w", err)
	}
	return data, nil
}

// PutObject uploads a stream directly to R2 (used for legacy multipart fallback).
func (c *R2Client) PutObject(ctx context.Context, key, contentType string, body io.Reader, size int64) error {
	if !c.Enabled() {
		return ErrStorageNotConfigured
	}
	input := &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	}
	if size > 0 {
		input.ContentLength = aws.Int64(size)
	}
	if _, err := c.client.PutObject(ctx, input); err != nil {
		return fmt.Errorf("put object: %w", err)
	}
	return nil
}

// DeleteObject removes an object from R2 (e.g. failed validation or user deletion).
func (c *R2Client) DeleteObject(ctx context.Context, key string) error {
	if !c.Enabled() {
		return ErrStorageNotConfigured
	}
	if _, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}); err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}
