// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
// TODO(phase-2): Remove after decomposing this file into domain modules with typed repositories.
import { createClient } from '@libsql/client'

export function getDB() {
  const url = process.env.TURSO_URL || process.env.DATABASE_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL or TURSO_URL must be set in production. ' +
        'Check your Vercel environment variables.',
      )
    }
    console.warn('[DB] No DATABASE_URL or TURSO_URL set — falling back to local.db for development')
    return createClient({ url: 'file:local.db', authToken: '' })
  }
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  return createClient({ url, authToken })
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function mapRow(columns: string[]) {
  return (row: Record<string, unknown>) => {
    const obj: Record<string, unknown> = {}
    for (const col of columns) {
      obj[col] = row[col]
    }
    return obj
  }
}
