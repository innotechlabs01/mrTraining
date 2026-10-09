import { BlogPostPage } from '@/components/landing/blog-pages';
import { notFound } from 'next/navigation';

export default function BlogPost({ params }: { params: { slug: string } }) {
  if (!params.slug) notFound();
  return <BlogPostPage slug={params.slug} />;
}