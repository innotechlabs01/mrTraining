import { safeExecute } from './db'

export async function insertLandingContact(input: {
  name: string;
  email: string;
  message: string;
}): Promise<boolean> {
  try {
    await safeExecute(
      `INSERT INTO landing_contacts (name, email, message) VALUES ($1, $2, $3)`,
      [input.name, input.email, input.message]
    );
    return true;
  } catch {
    return false;
  }
}
