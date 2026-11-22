import { NextResponse } from 'next/server';

/**
 * Retired: challenge video uploads now stream directly to Cloudflare R2 using
 * POST /api/media/presign-upload + PUT to R2 + POST /api/media/confirm.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Direct upload to Vercel Blob is retired; use /api/media/presign-upload' },
    { status: 410 },
  );
}
