import { smartClient as apiClient } from '@infrastructure/api/client';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  category: string;
  tags: string[];
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
  published_at?: string;
  read_time_minutes?: number;
  created_at?: string;
};

type ListResponse = {
  data?: GoArticle[];
  total?: number;
  page?: number;
  limit?: number;
};

function mapArticle(a: GoArticle): BlogPost {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    excerpt: a.excerpt ?? a.content?.slice(0, 120) ?? '',
    slug: a.slug,
    category: a.category ?? '',
    tags: a.tags ?? [],
    createdAt: a.created_at ?? '',
    publishedAt: a.published_at ?? '',
    readTimeMinutes: a.read_time_minutes ?? 5,
  };
}

/** List published blog posts, newest-first (order preserved from API). */
export const listBlogPosts = async (): Promise<BlogPost[]> => {
  const { data } = await apiClient.get<ListResponse>('/blog');
  const list = Array.isArray(data) ? (data as unknown as GoArticle[]) : (data?.data ?? []);
  return list.map(mapArticle);
};

/** Get a single blog post by ID. */
export const getBlogPost = async (id: string): Promise<BlogPost> => {
  const { data } = await apiClient.get<GoArticle>(`/blog/${id}`);
  return mapArticle(data);
};