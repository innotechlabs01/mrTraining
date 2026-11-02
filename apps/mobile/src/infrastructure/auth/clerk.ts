let clerkInstance: any = null;

type SessionExpiredCallback = () => void;

let onSessionExpired: SessionExpiredCallback | null = null;

export function setClerkInstance(clerk: any) {
  clerkInstance = clerk;
}

export function getClerkInstance(): any {
  return clerkInstance;
}

export function setOnSessionExpired(cb: SessionExpiredCallback | null) {
  onSessionExpired = cb;
}

export function getOnSessionExpired(): SessionExpiredCallback | null {
  return onSessionExpired;
}

export async function getClerkToken(opts?: { skipCache?: boolean }): Promise<string | null> {
  if (!clerkInstance?.session) return null;
  try {
    if (opts?.skipCache) {
      const token = await clerkInstance.session.getToken({ skipCache: true });
      if (token === null && onSessionExpired) {
        onSessionExpired();
      }
      return token;
    }
    return await clerkInstance.session.getToken();
  } catch {
    return null;
  }
}

export async function refreshClerkToken(): Promise<string | null> {
  return getClerkToken({ skipCache: true });
}

export async function getClerkUserId(): Promise<string | null> {
  return clerkInstance?.user?.id ?? null;
}