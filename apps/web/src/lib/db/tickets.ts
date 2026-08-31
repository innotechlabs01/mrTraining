import { getDB, generateId } from './db'

// ============== Support Tickets ==============

export async function getTickets(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM support_tickets WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  const tickets = []
  for (const r of result.rows) {
    const msgs = await db.execute('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at', [r.id])
    tickets.push({
      id: r.id, number: r.ticket_number, subject: r.subject, category: r.category, priority: r.priority, status: r.status,
      createdAt: r.created_at, resolvedAt: r.resolved_at || undefined,
      messages: msgs.rows.map(m => ({ id: m.id, author: m.author, body: m.body, imageUrl: m.image_url || '', createdAt: m.created_at })),
    })
  }
  return tickets
}

export async function saveTicket(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM support_tickets WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE support_tickets SET subject=?, category=?, priority=?, status=?, resolved_at=? WHERE id=? AND coach_id=?',
      [data.subject, data.category, data.priority, data.status, data.resolvedAt || null, id, coachId],
    )
  } else {
    const maxNum = await db.execute('SELECT COALESCE(MAX(ticket_number),0)+1 as next FROM support_tickets WHERE coach_id=?', [coachId])
    const number = (maxNum.rows[0]?.next as number) || 1
    await db.execute(
      'INSERT INTO support_tickets (id, ticket_number, subject, category, priority, status, coach_id, created_at) VALUES (?,?,?,?,?,?,?,datetime(\'now\'))',
      [id, number, data.subject, data.category, data.priority, data.status, coachId],
    )
  }
  await db.execute('DELETE FROM ticket_messages WHERE ticket_id = ?', [id])
  for (const m of (data.messages as Array<Record<string, unknown>>) || []) {
    await db.execute(
      'INSERT INTO ticket_messages (id, ticket_id, author, body, image_url, created_at) VALUES (?,?,?,?,?,?)',
      [m.id || generateId(), id, m.author, m.body, m.imageUrl || '', m.createdAt || new Date().toISOString()],
    )
  }
  return id
}
