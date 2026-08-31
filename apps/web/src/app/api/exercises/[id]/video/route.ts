import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { getDB } from '@/lib/db/db';

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
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

    const db = getDB();
    const exResult = await db.execute(
      'SELECT id FROM exercise_library WHERE id = ?',
      [ctx.params.id],
    );
    if (exResult.rows.length === 0) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const ext = contentType.split('/')[1] || 'mp4';
    const blob = await put(`exercises/${ctx.params.id}/demo.${ext}`, req.body!, {
      access: 'public',
      contentType,
    });

    await db.execute(
      "UPDATE exercise_library SET video_url = ?, updated_at = datetime('now') WHERE id = ?",
      [blob.url, ctx.params.id],
    );

    return NextResponse.json({ videoUrl: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Error uploading exercise video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
