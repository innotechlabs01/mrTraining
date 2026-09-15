import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

async function saveToLocal(file: File, ext: string): Promise<string> {
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'exercises');
  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, filename), buffer);
  return `/uploads/exercises/${filename}`;
}

// POST /api/exercises/upload — id-agnostic video upload.
// Production: Vercel Blob. Development: local filesystem (public/uploads/).
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
    if (!ALLOWED_TYPES.some(t => contentType.includes(t))) {
      return NextResponse.json({ error: 'Unsupported video format' }, { status: 400 });
    }

    const ext = contentType.split('/')[1] || 'mp4';
    const isDev = process.env.NODE_ENV === 'development';
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    let videoUrl: string;

    if (isDev && !hasBlobToken) {
      videoUrl = await saveToLocal(file, ext);
    } else {
      const blob = await put(`exercises/pending/${randomUUID()}.${ext}`, file, {
        access: 'public',
        contentType,
      });
      videoUrl = blob.url;
    }

    return NextResponse.json({ videoUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading exercise video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}