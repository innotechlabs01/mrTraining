import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!TURSO_URL) return null;
  if (client) return client;
  client = createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN,
  });
  return client;
}

export async function insertLandingContact(input: {
  name: string;
  email: string;
  message: string;
}): Promise<boolean> {
  const c = getClient();
  if (!c) return false;

  try {
    await c.execute(`
      CREATE TABLE IF NOT EXISTS landing_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await c.execute(
      'INSERT INTO landing_contacts (name, email, message) VALUES (?, ?, ?)',
      [input.name, input.email, input.message]
    );
    return true;
  } catch {
    return false;
  }
}