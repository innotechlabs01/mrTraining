import { useState, useEffect } from 'react';
import type { Clerk } from '@clerk/clerk-react-native';
import { setClerkInstance } from '@infrastructure/auth/clerk';

let cachedUserId: string | null = null;

export function initClerkUserId(clerk: Clerk) {
  setClerkInstance(clerk);
}

export function useClerkUserId() {
  const [userId, setUserId] = useState<string | null>(cachedUserId);

  useEffect(() => {
    import('@clerk/clerk-react-native').then(({ useAuth }) => {
      const { userId: uid } = useAuth();
      if (uid) {
        cachedUserId = uid;
        setUserId(uid);
      }
    });
  }, []);

  return userId ?? cachedUserId;
}
