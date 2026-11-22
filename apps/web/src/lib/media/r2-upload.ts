export type MediaPurpose =
  | 'exercise_video'
  | 'exercise_image'
  | 'challenge_demo'
  | 'coach_feed_media'
  | 'landing_media'
  | 'coach_landing_media'
  | 'blog_cover'
  | 'product_image'
  | 'support_attachment'
  | 'avatar';

export interface UploadMediaResult {
  mediaId: string;
  objectKey: string;
  mediaRef: string;
  previewUrl: string;
}

interface PresignUploadPayload {
  media_id: string;
  object_key: string;
  media_ref: string;
  upload_url: string;
  headers?: Record<string, string>;
}

interface ConfirmUploadPayload {
  media_id: string;
  object_key: string;
  media_ref: string;
  preview_url: string;
}

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

function putFileWithProgress(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Error subiendo archivo a R2 (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red subiendo archivo a R2'));
    xhr.send(file);
  });
}

/**
 * Uploads an image or video directly from the browser to Cloudflare R2:
 * 1. Requests a Clerk-authenticated SigV4 PUT URL from Vercel (/api/media/presign-upload).
 * 2. Streams the file directly to R2 via XHR PUT (0 bytes buffered on Vercel).
 * 3. Confirms the upload via /api/media/confirm (HeadObject + magic-byte check).
 */
function inferContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    case 'm4v':
      return 'video/x-m4v';
    default:
      return file.type || 'application/octet-stream';
  }
}

export async function uploadMediaToR2(
  file: File,
  purpose: MediaPurpose,
  opts?: { resourceId?: string; onProgress?: (percent: number) => void },
): Promise<UploadMediaResult> {
  const contentType = inferContentType(file);

  const presignRes = await fetch('/api/media/presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      purpose,
      filename: file.name,
      content_type: contentType,
      size_bytes: file.size,
      resource_id: opts?.resourceId,
    }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err?.error || `No se pudo firmar la subida (${presignRes.status})`);
  }

  const presign = unwrapData<PresignUploadPayload>(await presignRes.json());
  const putHeaders: Record<string, string> = {
    'Content-Type': contentType,
    ...(presign.headers ?? {}),
  };

  await putFileWithProgress(presign.upload_url, file, putHeaders, opts?.onProgress);

  const confirmRes = await fetch('/api/media/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: presign.media_id }),
  });
  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}));
    throw new Error(err?.error || `No se pudo confirmar la subida (${confirmRes.status})`);
  }

  const confirmed = unwrapData<ConfirmUploadPayload>(await confirmRes.json());
  return {
    mediaId: confirmed.media_id,
    objectKey: confirmed.object_key,
    mediaRef: confirmed.media_ref,
    previewUrl: confirmed.preview_url,
  };
}
