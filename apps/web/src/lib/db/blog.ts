import { getDB, generateId, safeExecute } from './db'

// ============== Blog Posts ==============

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  imageUrl: string
  isPublished: boolean
  publishedAt: string | null
  coachId: string
  createdAt: string
  updatedAt: string
  readTimeMinutes: number
  views: number
}

export async function getBlogPosts(coachId: string, publishedOnly = false) {
  const db = getDB()
  const query = publishedOnly
    ? 'SELECT * FROM blog_posts WHERE coach_id = ? AND is_published = 1 ORDER BY published_at DESC, created_at DESC'
    : 'SELECT * FROM blog_posts WHERE coach_id = ? ORDER BY created_at DESC'
  const result = await db.execute(query, [coachId])
  const posts: BlogPost[] = []
  for (const r of result.rows) {
    const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
    posts.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string,
      content: r.content as string,
      category: r.category as string,
      tags: r.tags ? JSON.parse(r.tags as string) : [],
      imageUrl: r.image_url as string,
      isPublished: r.is_published === 1,
      publishedAt: r.published_at as string,
      coachId: r.coach_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
      views: (meta.rows[0]?.views as number) || 0,
    })
  }
  return posts
}

export async function getBlogPostBySlug(coachId: string, slug: string) {
  const db = getDB()
  const result = await db.execute('SELECT * FROM blog_posts WHERE coach_id = ? AND slug = ?', [coachId, slug])
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    category: r.category as string,
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    imageUrl: r.image_url as string,
    isPublished: r.is_published === 1,
    publishedAt: r.published_at as string,
    coachId: r.coach_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
    views: (meta.rows[0]?.views as number) || 0,
  } as BlogPost
}

export async function saveBlogPost(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const tags = JSON.stringify(data.tags || [])
  const existing = await db.execute('SELECT id FROM blog_posts WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await safeExecute(
      db,
      'UPDATE blog_posts SET slug=?, title=?, excerpt=?, content=?, category=?, tags=?, image_url=?, is_published=?, published_at=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.slug, data.title, data.excerpt, data.content, data.category, tags, data.imageUrl, data.isPublished ? 1 : 0, data.publishedAt || null, id, coachId],
    )
  } else {
    await safeExecute(
      db,
      'INSERT INTO blog_posts (id, slug, title, excerpt, content, category, tags, image_url, is_published, published_at, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.slug, data.title, data.excerpt, data.content, data.category, tags, data.imageUrl, data.isPublished ? 1 : 0, data.publishedAt || null, coachId],
    )
  }
  await safeExecute(
    db,
    'INSERT OR REPLACE INTO blog_post_meta (post_id, read_time_minutes, views) VALUES (?, ?, ?)',
    [id, data.readTimeMinutes || 5, data.views || 0],
  )
  return id
}

export async function deleteBlogPost(coachId: string, postId: string) {
  const db = getDB()
  await db.execute('DELETE FROM blog_posts WHERE id = ? AND coach_id = ?', [postId, coachId])
}

export async function incrementBlogView(coachId: string, slug: string) {
  const db = getDB()
  const result = await db.execute('SELECT id FROM blog_posts WHERE slug = ? AND coach_id = ? AND is_published = 1', [slug, coachId])
  if (result.rows.length === 0) return
  const postId = result.rows[0].id as string
  await db.execute(
    'INSERT OR IGNORE INTO blog_post_meta (post_id, read_time_minutes, views) VALUES (?, 5, 0)',
    [postId],
  )
  await db.execute('UPDATE blog_post_meta SET views = views + 1 WHERE post_id = ?', [postId])
}

export async function getPublicBlogPosts(coachSlug: string) {
  const coachId = coachSlug === 'default' ? 'default' : coachSlug
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE coach_id = ? AND is_published = 1 ORDER BY published_at DESC, created_at DESC',
    [coachId],
  )
  const posts: BlogPost[] = []
  for (const r of result.rows) {
    const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
    posts.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string,
      content: r.content as string,
      category: r.category as string,
      tags: r.tags ? JSON.parse(r.tags as string) : [],
      imageUrl: r.image_url as string,
      isPublished: r.is_published === 1,
      publishedAt: r.published_at as string,
      coachId: r.coach_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
      views: (meta.rows[0]?.views as number) || 0,
    })
  }
  return posts
}

export async function getPublicBlogPostBySlug(coachSlug: string, slug: string) {
  const coachId = coachSlug === 'default' ? 'default' : coachSlug
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE coach_id = ? AND slug = ? AND is_published = 1',
    [coachId, slug],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    category: r.category as string,
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    imageUrl: r.image_url as string,
    isPublished: r.is_published === 1,
    publishedAt: r.published_at as string,
    coachId: r.coach_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
    views: (meta.rows[0]?.views as number) || 0,
  }
}

export async function getAllPublicBlogPosts() {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY published_at DESC, created_at DESC',
  )
  const posts: BlogPost[] = []
  for (const r of result.rows) {
    const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
    posts.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string,
      content: r.content as string,
      category: r.category as string,
      tags: r.tags ? JSON.parse(r.tags as string) : [],
      imageUrl: r.image_url as string,
      isPublished: r.is_published === 1,
      publishedAt: r.published_at as string,
      coachId: r.coach_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
      views: (meta.rows[0]?.views as number) || 0,
    })
  }
  return posts
}

export async function getAllPublicBlogPostBySlug(slug: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1',
    [slug],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    category: r.category as string,
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    imageUrl: r.image_url as string,
    isPublished: r.is_published === 1,
    publishedAt: r.published_at as string,
    coachId: r.coach_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
    views: (meta.rows[0]?.views as number) || 0,
  }
}
