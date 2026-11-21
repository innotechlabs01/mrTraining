import { smartClient as apiClient } from '@infrastructure/api/client';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  category: string;
  tags: string[];
  imageUrl?: string | undefined;
  createdAt: string;
  publishedAt: string;
  readTimeMinutes: number;
}

type GoArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags?: string[];
  image_url?: string;
  cover_image_url?: string;
  published_at?: string;
  read_time_minutes?: number;
  created_at?: string;
};

type ListEnvelope =
  | GoArticle[]
  | { data?: GoArticle[] | { data?: GoArticle[]; articles?: GoArticle[] }; articles?: GoArticle[] };

type OneEnvelope = GoArticle | { data?: GoArticle };

function mapArticle(a: GoArticle): BlogPost {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    excerpt: a.excerpt ?? a.content?.slice(0, 120) ?? '',
    slug: a.slug,
    category: a.category ?? '',
    tags: a.tags ?? [],
    imageUrl: a.image_url || a.cover_image_url || undefined,
    createdAt: a.created_at ?? '',
    publishedAt: a.published_at ?? '',
    readTimeMinutes: a.read_time_minutes ?? 5,
  };
}

/** List published blog posts, newest-first (order preserved from API). */
export const listBlogPosts = async (): Promise<BlogPost[]> => {
  const { data } = await apiClient.get<ListEnvelope>('/blog');
  if (Array.isArray(data)) {
    return data.map(mapArticle);
  }
  const inner = data?.data;
  if (Array.isArray(inner)) {
    return inner.map(mapArticle);
  }
  const list = inner?.data ?? inner?.articles ?? data?.articles ?? [];
  return list.map(mapArticle);
};

export const getBlogPost = async (id: string): Promise<BlogPost> => {
  const { data } = await apiClient.get<OneEnvelope>(`/blog/${id}`);
  const article = (data && typeof data === 'object' && 'data' in data && data.data ? data.data : data) as GoArticle;
  return mapArticle(article);
};
