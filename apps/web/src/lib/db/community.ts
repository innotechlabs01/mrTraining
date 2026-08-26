// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB, generateId } from './db'

// ============== Community Forums & Messages (migration 018) ==============

export async function getCommunityForums(coachId?: string) {
  const db = getDB()
  const result = coachId
    ? await db.execute('SELECT * FROM community_forums WHERE coach_id = ? ORDER BY created_at DESC', [coachId])
    : await db.execute('SELECT * FROM community_forums ORDER BY created_at DESC')
  return result.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    category: (r.category as string) || 'general',
    coachId: (r.coach_id as string) || null,
    createdAt: r.created_at as string,
  }))
}

export async function getCommunityMessages(forumId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM community_messages WHERE forum_id = ? ORDER BY created_at ASC',
    [forumId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    forumId: r.forum_id as string,
    userId: r.user_id as string,
    userName: (r.user_name as string) || 'Athlete',
    message: r.message as string,
    createdAt: r.created_at as string,
  }))
}

export async function createCommunityMessage(data: {
  forumId: string
  userId: string
  userName?: string
  message: string
}) {
  const db = getDB()
  const id = generateId()
  await db.execute(
    `INSERT INTO community_messages (id, forum_id, user_id, user_name, message, created_at)
     VALUES (?,?,?,?,?,datetime('now'))`,
    [id, data.forumId, data.userId, data.userName || 'Athlete', data.message],
  )
  return id
}

// ============== Community Challenges (migration 018) ==============

export async function getCommunityChallenges() {
  const db = getDB()
  const result = await db.execute(
    "SELECT * FROM community_challenges WHERE status = 'active' ORDER BY created_at DESC",
  )
  return result.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    durationMinutes: r.duration_minutes as number,
    calories: r.calories as number,
    participantsCount: r.participants_count as number,
    status: r.status as string,
    startDate: (r.start_date as string) || null,
    endDate: (r.end_date as string) || null,
    createdAt: r.created_at as string,
  }))
}

export async function joinChallenge(challengeId: string, userId: string) {
  const db = getDB()
  const id = generateId()
  try {
    await db.execute(
      `INSERT INTO community_challenge_participants (id, challenge_id, user_id, joined_at, progress)
       VALUES (?,?,?,datetime('now'),0)`,
      [id, challengeId, userId],
    )
    await db.execute(
      'UPDATE community_challenges SET participants_count = participants_count + 1 WHERE id = ?',
      [challengeId],
    )
    return { joined: true, participantId: id }
  } catch {
    // UNIQUE constraint — already joined
    return { joined: false, participantId: null }
  }
}

export async function getChallengeParticipants(challengeId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM community_challenge_participants WHERE challenge_id = ? ORDER BY joined_at ASC',
    [challengeId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    challengeId: r.challenge_id as string,
    userId: r.user_id as string,
    joinedAt: r.joined_at as string,
    progress: r.progress as number,
  }))
}
