import { NextResponse } from 'next/server';
import { getPublicBlogPosts, getPublicBlogPostBySlug } from '@/lib/coaching-db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const coachSlug = searchParams.get('coach') || 'default';

  try {
    if (slug) {
      const post = await getPublicBlogPostBySlug(coachSlug, slug);
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(post);
    }

    const posts = await getPublicBlogPosts(coachSlug);
    return NextResponse.json(posts);
  } catch {
    if (slug) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json([], { status: 200 });
  }
}
