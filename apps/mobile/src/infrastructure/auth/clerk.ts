let clerkInstance: any = null;

export function setClerkInstance(clerk: any) {
  clerkInstance = clerk;
}

export function getClerkInstance(): any {
  return clerkInstance;
}

export async function getClerkToken(opts?: { skipCache?: boolean }): Promise<string | null> {
  if (!clerkInstance?.session) return null;
  try {
    if (opts?.skipCache) {
      return await clerkInstance.session.getToken({ skipCache: true });
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
