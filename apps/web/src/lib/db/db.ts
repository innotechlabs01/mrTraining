import { Pool, type PoolClient, type QueryResult } from 'pg'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 200

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === '57P01' || code === '57P02'
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'DATABASE_URL must be set in production. Check your environment variables.',
        )
      }
      console.warn('[DB] No DATABASE_URL set — falling back to local PostgreSQL for development')
      pool = new Pool({ connectionString: 'postgres://mrtraining:mrtraining@localhost:5432/mrtraining?sslmode=disable' })
    } else {
      pool = new Pool({ connectionString: url })
    }
  }
  return pool
}

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
 * Replaces each ? sequentially. Safe for SQL queries where ? only appears
 * as a parameter placeholder (not inside string literals).
 */
function convertPlaceholders(sql: string): string {
  let n = 1
  return sql.replace(/\?/g, () => `$${n++}`)
}

/**
 * Execute a parameterized query against PostgreSQL.
 * Accepts both $1, $2 style and ? style placeholders (converted automatically).
 * Args can be passed as an array or as individual arguments.
 */
export async function safeExecute(
  query: string,
  ...args: unknown[]
): Promise<QueryResult> {
  const db = getPool()
  const convertedQuery = convertPlaceholders(query)
  const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await db.query(convertedQuery, params)
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

/**
 * Backward-compatible wrapper: returns an object with an `execute` method
 * that accepts (sql, args) like the old libsql client. Placeholders ? are
 * auto-converted to $1, $2, ... for PostgreSQL.
 */
/**
 * Backward-compatible wrapper: returns an object with an `execute` method
 * that accepts both libsql-style { sql, args } and PostgreSQL-style
 * (sql, ...args) calls. Placeholders ? are auto-converted to $1, $2, ...
 */
export function getDB() {
  const db = getPool()
  return {
    execute: async (
      sqlOrConfig: string | { sql: string; args?: unknown[] },
      ...restArgs: unknown[]
    ): Promise<QueryResult> => {
      let sql: string
      let params: unknown[]
      if (typeof sqlOrConfig === 'object' && sqlOrConfig !== null && 'sql' in sqlOrConfig) {
        sql = sqlOrConfig.sql
        params = sqlOrConfig.args ?? []
      } else {
        sql = sqlOrConfig as string
        params = restArgs.length === 1 && Array.isArray(restArgs[0]) ? restArgs[0] : restArgs
      }
      return db.query(convertPlaceholders(sql), params)
    },
  } as { execute: (sqlOrConfig: string | { sql: string; args?: unknown[] }, ...restArgs: unknown[]) => Promise<QueryResult> }
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

/**
 * Get a single client from the pool for multi-statement transactions.
 * Caller must release the client when done.
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect()
}
