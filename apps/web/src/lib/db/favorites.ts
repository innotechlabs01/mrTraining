import { getDB, generateId } from './db'

// ============== Athlete Favorites (migration 018) ==============

export async function getAthleteFavorites(userId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    itemType: r.item_type as string,
    itemId: r.item_id as string,
    itemTitle: (r.item_title as string) || '',
    itemMeta: (r.item_meta as string) || '',
    createdAt: r.created_at as string,
  }))
}

export async function addAthleteFavorite(userId: string, data: {
  itemType: string
  itemId: string
  itemTitle?: string
  itemMeta?: string
}) {
  const db = getDB()
  const id = generateId()
  try {
    await db.execute(
      `INSERT INTO athlete_favorites (id, user_id, item_type, item_id, item_title, item_meta, created_at)
       VALUES (?,?,?,?,?,?,datetime('now'))`,
      [id, userId, data.itemType, data.itemId, data.itemTitle || '', data.itemMeta || ''],
    )
    return { id, added: true }
  } catch {
    // UNIQUE constraint — already favorited
    return { id: null, added: false }
  }
}

export async function removeAthleteFavorite(userId: string, favoriteId: string) {
  const db = getDB()
  await db.execute(
    'DELETE FROM athlete_favorites WHERE id = ? AND user_id = ?',
    [favoriteId, userId],
  )
}
