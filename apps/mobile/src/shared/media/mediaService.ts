import * as FileSystem from 'expo-file-system/legacy';

import { GO_API_URL, smartClient } from '@/infrastructure/api/client';

export type MediaPurpose =
  | 'form_recording'
  | 'challenge_attempt'
  | 'support_attachment'
  | 'avatar';

export interface PresignedReadEntry {
  url: string;
  expires_at: string;
}

export interface UploadMediaOptions {
  filename?: string;
  contentType?: string;
  resourceId?: string;
}

export interface UploadMediaResult {
  mediaRef: string;
  previewUrl: string;
}

interface PresignUploadResponse {
  media_id: string;
  object_key: string;
  media_ref: string;
  upload_url: string;
  headers: Record<string, string>;
  expires_at: string;
}

interface ConfirmUploadResponse {
  media_id: string;
  object_key: string;
  media_ref: string;
  preview_url: string;
  expires_at: string;
}

const MAX_PRESIGN_READ_BATCH = 50;

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

/** Returns true when the value is an R2 media reference (`r2://...`). */
export function isR2Ref(url?: string | null): boolean {
  return typeof url === 'string' && url.trim().startsWith('r2://');
}

/**
 * Resolves legacy media URLs (`/uploads/...` and `http(s)://...`).
 * Returns `undefined` for empty values or `r2://` refs (which must be presigned).
 */
export function resolveLegacyMediaUrl(url?: string | null): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || isR2Ref(trimmed)) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    const base = GO_API_URL.replace(/\/+$/, '');
    return `${base}${trimmed}`;
  }

  return undefined;
}

function inferContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data;
  }
  return payload as T;
}

/**
 * Requests short-lived signed read URLs for a batch of `r2://` references.
 * Automatically chunks into batches of 50 to respect the Go API limit.
 */
export async function presignReadBatch(
  refs: string[],
): Promise<Record<string, PresignedReadEntry>> {
  const uniqueRefs = Array.from(
    new Set(refs.map((r) => r.trim()).filter((r) => isR2Ref(r))),
  );
  if (uniqueRefs.length === 0) {
    return {};
  }

  const merged: Record<string, PresignedReadEntry> = {};

  for (let i = 0; i < uniqueRefs.length; i += MAX_PRESIGN_READ_BATCH) {
    const chunk = uniqueRefs.slice(i, i + MAX_PRESIGN_READ_BATCH);
    const response = await smartClient.post<
      { data?: { urls?: Record<string, PresignedReadEntry> }; urls?: Record<string, PresignedReadEntry> }
    >('/media/presign-read', { refs: chunk });

    const body = response.data;
    const urls = body?.data?.urls ?? body?.urls ?? {};
    Object.assign(merged, urls);
  }

  return merged;
}

/**
 * Uploads a local media file directly to Cloudflare R2 via presigned PUT
 * and confirms the upload with the Go API.
 */
export async function uploadMediaToR2(
  fileUri: string,
  purpose: MediaPurpose,
  opts?: UploadMediaOptions,
): Promise<UploadMediaResult> {
  const normalizedUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
  if (!fileInfo.exists) {
    throw new Error(`Media file not found: ${normalizedUri}`);
  }

  const sizeBytes = 'size' in fileInfo && typeof fileInfo.size === 'number' ? fileInfo.size : 0;
  const filename = opts?.filename ?? (normalizedUri.split('/').pop() || `upload-${Date.now()}.mp4`);
  const contentType = opts?.contentType ?? inferContentType(filename);

  const presignRes = await smartClient.post<PresignUploadResponse | { data: PresignUploadResponse }>(
    '/media/presign-upload',
    {
      purpose,
      filename,
      content_type: contentType,
      size_bytes: sizeBytes,
      ...(opts?.resourceId ? { resource_id: opts.resourceId } : {}),
    },
  );
  const presigned = unwrapData(presignRes.data);

  const uploadRes = await FileSystem.uploadAsync(presigned.upload_url, normalizedUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: presigned.headers,
  });

  if (uploadRes.status < 200 || uploadRes.status >= 300) {
    throw new Error(`R2 upload failed with status ${uploadRes.status}`);
  }

  const confirmRes = await smartClient.post<ConfirmUploadResponse | { data: ConfirmUploadResponse }>(
    '/media/confirm',
    { media_id: presigned.media_id },
  );
  const confirmed = unwrapData(confirmRes.data);

  return {
    mediaRef: confirmed.media_ref ?? presigned.media_ref,
    previewUrl: confirmed.preview_url ?? '',
  };
}
