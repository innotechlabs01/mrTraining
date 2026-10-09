import { getDB, generateId, safeExecute } from './db'

export interface BlogPost {
  id: string
  coachId: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  coverImageUrl: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function listBlogPosts(coachId: string, options?: { publishedOnly?: boolean; limit?: number; offset?: number }): Promise<BlogPost[]> {
  const db = getDB()
  let query = 'SELECT * FROM blog_posts WHERE coach_id = ?'
  const params: (string | number)[] = [coachId]

  if (options?.publishedOnly) {
    query += ' AND published = 1'
  }
  query += ' ORDER BY created_at DESC'
  if (options?.limit) {
    query += ' LIMIT ?'
    params.push(options.limit)
  }
  if (options?.offset) {
    query += ' OFFSET ?'
    params.push(options.offset)
  }

  const result = await db.execute(query, params)
  return result.rows.map((r) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    slug: r.slug as string,
    title: r.title as string,
    content: r.content as string,
    excerpt: r.excerpt as string | null,
    coverImageUrl: r.image_url as string | null,
    published: Boolean(r.is_published),
    publishedAt: r.published_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = getDB()
  const result = await db.execute('SELECT * FROM blog_posts WHERE slug = ?', [slug])
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    slug: r.slug as string,
    title: r.title as string,
    content: r.content as string,
    excerpt: r.excerpt as string | null,
    coverImageUrl: r.image_url as string | null,
    published: Boolean(r.is_published),
    publishedAt: r.published_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const db = getDB()
  const result = await db.execute('SELECT * FROM blog_posts WHERE id = ?', [id])
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    slug: r.slug as string,
    title: r.title as string,
    content: r.content as string,
    excerpt: r.excerpt as string | null,
    coverImageUrl: r.image_url as string | null,
    published: Boolean(r.is_published),
    publishedAt: r.published_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function createBlogPost(data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlogPost> {
  const db = getDB()
  const now = new Date().toISOString()
  const post: BlogPost = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  await db.execute(
    `INSERT INTO blog_posts (id, coach_id, slug, title, content, excerpt, cover_image_url, published, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [post.id, post.coachId, post.slug, post.title, post.content, post.excerpt, post.coverImageUrl, post.published ? 1 : 0, post.publishedAt, post.createdAt, post.updatedAt]
  )
  return post
}

export async function updateBlogPost(id: string, data: Partial<Omit<BlogPost, 'id' | 'coachId' | 'createdAt' | 'updatedAt'>>): Promise<BlogPost | null> {
  const db = getDB()
  const now = new Date().toISOString()
  const updates: string[] = []
  const params: unknown[] = []

  if (data.slug !== undefined) { updates.push('slug = ?'); params.push(data.slug) }
  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title) }
  if (data.content !== undefined) { updates.push('content = ?'); params.push(data.content) }
  if (data.excerpt !== undefined) { updates.push('excerpt = ?'); params.push(data.excerpt) }
  if (data.coverImageUrl !== undefined) { updates.push('cover_image_url = ?'); params.push(data.coverImageUrl) }
  if (data.published !== undefined) { updates.push('published = ?'); params.push(data.published ? 1 : 0) }
  if (data.publishedAt !== undefined) { updates.push('published_at = ?'); params.push(data.publishedAt) }

  if (updates.length === 0) return getBlogPostById(id)

  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)

  await safeExecute(
    db,
    `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`,
    params
  )
  return getBlogPostById(id)
}

export async function deleteBlogPost(id: string): Promise<void> {
  const db = getDB()
  await db.execute('DELETE FROM blog_posts WHERE id = ?', [id])
}

// ============== Public Blog Functions (Marketing) ==============

export interface PublicBlogPost {
  id: string
  coachId: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  coverImageUrl: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  coachName?: string
  coachAvatarUrl?: string
}

export async function getAllPublicBlogPosts(): Promise<PublicBlogPost[]> {
  const db = getDB()
  const result = await db.execute(
    `SELECT bp.*, u.name as coach_name, u.avatar_url as coach_avatar_url
     FROM blog_posts bp
     INNER JOIN users u ON bp.coach_id = u.id
     WHERE bp.is_published = 1
     ORDER BY bp.published_at DESC`
  )
  return result.rows.map((r) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    slug: r.slug as string,
    title: r.title as string,
    content: r.content as string,
    excerpt: r.excerpt as string | null,
    coverImageUrl: r.image_url as string | null,
    published: Boolean(r.is_published),
    publishedAt: r.published_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    coachName: r.coach_name as string | undefined,
    coachAvatarUrl: r.coach_avatar_url as string | undefined,
  }))
}

export async function getAllPublicBlogPostBySlug(slug: string): Promise<PublicBlogPost | null> {
  const db = getDB()
  const result = await db.execute(
    `SELECT bp.*, u.name as coach_name, u.avatar_url as coach_avatar_url
     FROM blog_posts bp
     INNER JOIN users u ON bp.coach_id = u.id
     WHERE bp.slug = ? AND bp.published = 1`,
    [slug]
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    slug: r.slug as string,
    title: r.title as string,
    content: r.content as string,
    excerpt: r.excerpt as string | null,
    coverImageUrl: r.image_url as string | null,
    published: Boolean(r.is_published),
    publishedAt: r.published_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    coachName: r.coach_name as string | undefined,
    coachAvatarUrl: r.coach_avatar_url as string | undefined,
  }
}