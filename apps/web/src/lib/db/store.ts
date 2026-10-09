import { getDB, safeExecute } from './db'

// ============== Store (public products) ==============

export async function getPublicProducts(coachId?: string) {
  const db = getDB()
  let sql = `SELECT id, name, price, description, image_url, category, is_shop, created_at
     FROM products WHERE is_shop = 1`
  const args: unknown[] = []
  if (coachId) {
    sql += ` AND coach_id = ?`
    args.push(coachId)
  }
  sql += ` ORDER BY created_at DESC`
  const result = await safeExecute(db, sql, args)
  return result.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    price: r.price as number,
    description: (r.description as string) || '',
    imageUrl: (r.image_url as string) || '',
    category: (r.category as string) || '',
    isShop: Boolean(r.is_shop),
    createdAt: r.created_at as string,
  }))
}

export async function getAllPublicProducts() {
  const db = getDB()
  const result = await safeExecute(db,
    `SELECT p.*, u.name as coach_name
     FROM products p
     INNER JOIN users u ON p.coach_id = u.id
     WHERE p.is_shop = 1
     ORDER BY p.created_at DESC`
  )
  return result.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    price: r.price as number,
    description: (r.description as string) || '',
    imageUrl: (r.image_url as string) || '',
    category: (r.category as string) || '',
    isShop: Boolean(r.is_shop),
    createdAt: r.created_at as string,
    coachName: r.coach_name as string,
  }))
}