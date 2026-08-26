// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB } from './db'

// ============== Athlete Notifications (migration 018) ==============

export async function getAthleteNotifications(userId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    type: (r.type as string) || 'system',
    title: r.title as string,
    message: (r.message as string) || '',
    icon: (r.icon as string) || '',
    read: r.read === 1,
    createdAt: r.created_at as string,
  }))
}

export async function markNotificationRead(notificationId: string) {
  const db = getDB()
  await db.execute(
    'UPDATE athlete_notifications SET read = 1 WHERE id = ?',
    [notificationId],
  )
}
