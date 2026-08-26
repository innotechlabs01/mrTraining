import { NextResponse } from 'next/server';
import { getPublicBlogPosts, getPublicBlogPostBySlug, getAllPublicBlogPosts, getAllPublicBlogPostBySlug } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  try {
    if (slug) {
      const post = await getAllPublicBlogPostBySlug(slug);
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(post);
    }

    const posts = await getAllPublicBlogPosts();
    return NextResponse.json(posts);
  } catch {
    if (slug) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json([], { status: 200 });
  }
}
