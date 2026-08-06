import type { Clerk } from '@clerk/clerk-expo';

let clerkInstance: Clerk | null = null;

export function setClerkInstance(clerk: Clerk) {
  clerkInstance = clerk;
}

export async function getClerkToken(): Promise<string | null> {
  if (!clerkInstance?.session) return null;
  try {
    return await clerkInstance.session.getToken();
  } catch {
    return null;
  }
}

export async function getClerkUserId(): Promise<string | null> {
  return clerkInstance?.user?.id ?? null;
}
