import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

// POST /api/exercises/upload — id-agnostic video upload to Vercel Blob.
// The coach can pick a video BEFORE an exercise exists (create flow). Returns the
// public blob URL so the caller can persist it on the Exercise (videoUrl) — it does
// NOT touch the DB. Orphaned blobs (uploaded but never saved) can be cleaned up later.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 });
    }

    const contentType = req.headers.get('content-type') ?? '';
    if (!ALLOWED_TYPES.some(t => contentType.includes(t))) {
      return NextResponse.json({ error: 'Unsupported video format' }, { status: 400 });
    }

    const ext = contentType.split('/')[1] || 'mp4';
    const blob = await put(`exercises/pending/${randomUUID()}.${ext}`, req.body!, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ videoUrl: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Error uploading exercise video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}