// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB, generateId } from './db'

// ============== Push Tokens (migration 017) ==============

export async function registerPushToken(userId: string, token: string, platform: string, role: string): Promise<void> {
  const db = getDB()
  await db.execute(
    `INSERT INTO push_tokens (id, user_id, token, platform, role) VALUES (?,?,?,?,?)
     ON CONFLICT(token) DO UPDATE SET is_active = 1, user_id = excluded.user_id`,
    [generateId(), userId, token, platform, role],
  )
}

export async function getPushTokens(userIds: string[]): Promise<Array<{ token: string; platform: string }>> {
  if (userIds.length === 0) return []
  const db = getDB()
  const placeholders = userIds.map(() => '?').join(',')
  const result = await db.execute(
    `SELECT token, platform FROM push_tokens WHERE user_id IN (${placeholders}) AND is_active = 1`,
    userIds,
  )
  return result.rows.map(r => ({ token: r.token as string, platform: r.platform as string }))
}
