'use client';

import React, { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';

// Clerk v6 internally calls React.useActionState (a React 19 API) inside its
// KeylessCreatorOrReader, but this project runs on React 18.3 where it does not
// exist. Polyfill it (delegating to useFormState when present) so Clerk can mount.
const R = React as unknown as Record<string, unknown>;
if (typeof R.useActionState !== 'function') {
  if (typeof R.useFormState === 'function') {
    R.useActionState = R.useFormState;
  } else {
    R.useActionState = function useActionStateShim<S, P>(
      action: (state: S, payload: P) => S | Promise<S>,
      initialState: S,
    ): [S, (payload: P) => void] {
      const [state, setState] = React.useState<S>(initialState);
      const dispatch = React.useCallback(
        (payload: P) => {
          const next = action(state, payload);
          if (next instanceof Promise) {
            void next.then(setState);
          } else {
            setState(next);
          }
        },
        [action, state],
      );
      return [state, dispatch];
    };
  }
}

import { ClerkProvider } from '@clerk/nextjs';

/**
 * Silently refreshes the Clerk session token when the browser tab gains focus.
 * Prevents stale-token 401s after the tab sits idle.
 */
function TokenRefreshOnFocus() {
  const { session } = useClerk();
  useEffect(() => {
    if (!session) return;
    const onFocus = () => {
      session.getToken({ skipCache: true }).catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session]);
  return null;
}

export function ClerkProviderClient({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      telemetry={{ disabled: true }}
      appearance={{
        variables: {
          colorPrimary: '#FF6B00',
          colorBackground: '#0A0B0D',
          colorText: '#FFFFFF',
          colorTextSecondary: '#9CA3AF',
          colorInputBackground: '#141416',
          colorInputText: '#FFFFFF',
          borderRadius: '8px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      <TokenRefreshOnFocus />
      {children}
    </ClerkProvider>
  );
}