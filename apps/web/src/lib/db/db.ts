
import { createClient } from '@libsql/client'
import type { Client, InValue } from '@libsql/client'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 200

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  return code === 'SQLITE_UNKNOWN' || code === 'ECONNRESET' || code === 'ETIMEDOUT'
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function wrapWithRetry(client: Client): Client {
  const originalExecute = client.execute.bind(client)
  const wrapped = async (
    stmtOrSql: unknown,
    args?: unknown,
  ) => {
    let lastErr: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (args !== undefined) {
          return await originalExecute(stmtOrSql as string, args as InValue[])
        }
        return await originalExecute(stmtOrSql as Parameters<Client['execute']>[0])
      } catch (err) {
        lastErr = err
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          await delay(BASE_DELAY_MS * Math.pow(2, attempt))
        } else {
          throw err
        }
      }
    }
    throw lastErr
  }
  client.execute = wrapped as Client['execute']
  return client
}

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
    return wrapWithRetry(createClient({ url: 'file:local.db', authToken: '' }))
  }
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  return wrapWithRetry(createClient({ url, authToken }))
}

/**
 * Type-safe wrapper around db.execute that accepts unknown[] params.
 * libsql's InValue type is too strict for Record<string, unknown> dynamic params.
 * This is the ONLY place the cast happens — all domain modules use safeExecute.
 */
export function safeExecute(
  db: Client,
  query: string,
  args?: unknown[],
): ReturnType<Client['execute']> {
  return db.execute({ sql: query, args: (args ?? []) as InValue[] })
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
