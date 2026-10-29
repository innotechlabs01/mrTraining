import { getDB, generateId, mapRow, safeExecute } from './db'

// ============== Time Blocks ==============

export async function getTimeBlocks(coachId: string) {
  const result = await safeExecute(
    'SELECT * FROM time_blocks WHERE coach_id = ? ORDER BY display_order',
    [coachId],
  )
  return result.rows.map(mapRow(result.fields.map(f => f.name)))
}

export async function saveTimeBlocks(coachId: string, blocks: Array<{
  id: string; label: string; time: string; endTime: string; icon: string; displayOrder?: number
}>) {
  await safeExecute('DELETE FROM time_blocks WHERE coach_id = ?', [coachId])
  for (const b of blocks) {
    await safeExecute(
      'INSERT INTO time_blocks (id, label, time, end_time, icon, display_order, coach_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [b.id, b.label, b.time, b.endTime, b.icon, b.displayOrder ?? 0, coachId],
    )
  }
}

// ============== Public Page Config ==============

export async function getPublicPageConfig(coachId: string) {
  const result = await safeExecute(
    'SELECT * FROM public_page_config WHERE coach_id = ?',
    [coachId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    brandName: r.brand_name, tagline: r.tagline || '',
    welcomeMessage: r.welcome_message || '', footerText: r.footer_text,
  }
}

export async function savePublicPageConfig(coachId: string, data: Record<string, unknown>) {
  const id = generateId()
  const existing = await safeExecute('SELECT id FROM public_page_config WHERE coach_id = ?', [coachId])
  if (existing.rows.length > 0) {
    await safeExecute(
      'UPDATE public_page_config SET brand_name=?, tagline=?, welcome_message=?, footer_text=?, updated_at=NOW() WHERE coach_id=?',
      [data.brandName, data.tagline || '', data.welcomeMessage || '', data.footerText, coachId],
    )
  } else {
    await safeExecute(
      'INSERT INTO public_page_config (id, coach_id, brand_name, tagline, welcome_message, footer_text) VALUES (?,?,?,?,?,?)',
      [id, coachId, data.brandName, data.tagline || '', data.welcomeMessage || '', data.footerText],
    )
  }
}
