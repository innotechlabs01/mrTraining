import { getDB } from './db'

// ============== Public Store Products ==============

export async function getPublicProducts(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM products WHERE coach_id = ? AND is_shop = 1 AND stock > 0 ORDER BY name',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand || '', imageUrl: r.image_url || '',
    price: r.price, description: r.description || '', category: r.category || '',
    stock: r.stock, createdAt: r.created_at,
  }))
}

export async function getAllPublicProducts() {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM products WHERE is_shop = 1 AND stock > 0 ORDER BY name',
  )
  return result.rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand || '', imageUrl: r.image_url || '',
    price: r.price, description: r.description || '', category: r.category || '',
    stock: r.stock, createdAt: r.created_at,
  }))
}
