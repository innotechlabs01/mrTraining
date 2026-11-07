import { NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/go-client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  try {
    if (slug) {
      const post = await goFetch<{ id: string }>(
        `/public/blog/${encodeURIComponent(slug)}`,
        { auth: false },
      );
      if (!post || !post.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(post);
    }

    const res = await goFetch<{ data?: unknown[] }>('/public/blog', {
      auth: false,
    });
    const posts: unknown[] = Array.isArray(res) ? res : (res?.data ?? []);
    return NextResponse.json(posts);
  } catch {
    if (slug) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json([], { status: 200 });
  }
}
