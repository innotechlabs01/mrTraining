import { getDB, generateId, safeExecute } from './db'

// ============== Messages ==============

export async function getMessageThreads(coachId: string) {
  const db = getDB()
  const threads = await db.execute(
    'SELECT * FROM message_threads WHERE coach_id = ? ORDER BY updated_at DESC',
    [coachId],
  )
  const result = []
  for (const t of threads.rows) {
    const participants = await db.execute('SELECT * FROM thread_participants WHERE thread_id = ?', [t.id])
    const messages = await db.execute('SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC', [t.id])
    const msgRows = messages.rows.map(m => ({
      id: m.id as string, senderId: m.sender_id as string, senderName: m.sender_name as string,
      content: m.content as string, timestamp: m.timestamp as string, type: m.msg_type as string,
    }))
    result.push({
      id: t.id as string,
      participants: participants.rows.map(p => ({ id: p.athlete_id as string, name: p.name as string, avatarUrl: p.avatar_url as string || '' })),
      lastMessage: msgRows[msgRows.length - 1],
      unread: false,
      messages: msgRows,
    })
  }
  return result
}

export async function saveMessage(coachId: string, threadId: string, data: Record<string, unknown>) {
  const db = getDB()
  const msgId = generateId()
  await safeExecute(
    db,
    'INSERT INTO messages (id, thread_id, sender_id, sender_name, content, msg_type, timestamp) VALUES (?,?,?,?,?,?,datetime(\'now\'))',
    [msgId, threadId, data.senderId, data.senderName, data.content, data.type || 'text'],
  )
  await db.execute('UPDATE message_threads SET updated_at=datetime(\'now\') WHERE id=?', [threadId])
  return msgId
}

export async function createThread(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const threadId = generateId()
  await db.execute('INSERT INTO message_threads (id, coach_id) VALUES (?,?)', [threadId, coachId])
  for (const p of (data.participants as Array<Record<string, unknown>>) || []) {
    await safeExecute(
      db,
      'INSERT INTO thread_participants (thread_id, athlete_id, name, avatar_url) VALUES (?,?,?,?)',
      [threadId, p.id, p.name, p.avatarUrl || ''],
    )
  }
  return threadId
}
