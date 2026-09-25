import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

const MAX_SIZE = 50 * 1024 * 1024;
const EXTENSION = '.mp4';
const ALLOWED_TYPE = 'video/mp4';

// POST /api/exercises/upload — id-agnostic video upload.
// Always uploads to Vercel Blob so stored URLs are absolute and playable on every client (web + mobile).
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 });
    }

    const contentType = file.type;
    const fileName = file.name.toLowerCase();
    if (contentType !== ALLOWED_TYPE || !fileName.endsWith(EXTENSION)) {
      return NextResponse.json({ error: 'Only MP4 videos are allowed' }, { status: 400 });
    }

    const ext = 'mp4';

    const blob = await put(`exercises/pending/${randomUUID()}.${ext}`, file, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ videoUrl: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Error uploading exercise video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}