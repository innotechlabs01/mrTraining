import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { ClerkProvider, useClerk, useUser } from '@clerk/clerk-expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './Navigation';
import { setClerkInstance, setOnSessionExpired, getOnSessionExpired } from '../infrastructure/auth/clerk';
import { useAppFonts } from '../shared/theme/fonts';
import { registerBackgroundSync } from '../infrastructure/health/background-sync';
import { registerForPushNotifications } from '../infrastructure/notifications/push';
import {
  createMMKVPersister,
  rqCacheKey,
  shouldDehydrateQuery,
  RQ_CACHE_MAX_AGE,
} from '../infrastructure/storage/queryCachePersister';
import Toast, { toastConfig } from '../shared/components/ui/Toast';
import { OfflineBanner } from '../shared/components/ui/OfflineBanner';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 1000 * 60 * 30,
      // Instant tab/screen transitions: keep showing the previous page's data
      // while the next query resolves (no spinner flash on navigation).
      placeholderData: keepPreviousData,
    },
    mutations: { retry: 1 },
  },
});

/**
 * Persists the query cache to MMKV under a per-user key (`rq-cache-<userId>`,
 * `rq-cache-anon` pre-auth). On sign-out or account switch, the previous
 * user's in-memory AND persisted cache are dropped, so one athlete never
 * sees another's data. The Profile screen's sign-out goes through Clerk;
 * this component reacts to the user becoming null — no per-screen wiring.
 */
function QueryCachePersistor() {
  const { user } = useUser();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;

    const prevUserId = prevUserIdRef.current;
    if (prevUserId && prevUserId !== userId) {
      // Sign-out or account switch: purge the previous user's cache.
      queryClient.clear();
      createMMKVPersister(rqCacheKey(prevUserId)).removeClient();
    }
    prevUserIdRef.current = userId;

    const [unsubscribe, restorePromise] = persistQueryClient({
      queryClient,
      persister: createMMKVPersister(rqCacheKey(userId)),
      maxAge: RQ_CACHE_MAX_AGE,
      dehydrateOptions: { shouldDehydrateQuery },
    });
    // Errors during restore are handled internally (cache is discarded).
    void restorePromise;

    return () => unsubscribe();
  }, [user?.id]);

  return null;
}

// Hold the native splash until FontGate hides it after fonts resolve.
// Runs at module scope so it executes before the first render, even if the
// Clerk key check below throws.
SplashScreen.preventAutoHideAsync().catch(() => {});

const CLERK_KEY = Constants.expoConfig?.extra?.clerkPublishableKey || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISH_KEY;

if (!CLERK_KEY) {
  console.error('Missing clerkPublishableKey in app.json extra or env');
}

function ClerkInstanceSetter() {
  const clerk = useClerk();

  useEffect(() => {
    setClerkInstance(clerk);
    // Register global handler for unrecoverable auth (session dead).
    // When refreshClerkToken() returns null, this callback triggers signOut.
    // RootNavigator reacts to isSignedIn -> false and shows the Auth stack.
    setOnSessionExpired(() => {
      console.warn('[Auth] Session expired — signing out');
      void clerk.signOut();
    });
  }, [clerk]);

  return null;
}

function AppStateRefresh() {
  const clerk = useClerk();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && clerk.session) {
        // Pre-emptive token refresh on foreground.
        // Log failures; if session is unrecoverable, trigger global handler.
        clerk.session
          .getToken({ skipCache: true })
          .catch((err) => {
            console.warn('[AppStateRefresh] token refresh failed', err);
            // Clerk returns null/throws when the long-lived session is dead.
            // The getClerkToken(null, { skipCache: true }) path in clerk.ts
            // will call onSessionExpired. We also call it here as a fallback
            // in case the error surfaces before the auth interceptor runs.
            const cb = getOnSessionExpired();
            if (cb) {
              cb();
            }
          });
      }
    });
    return () => sub.remove();
  }, [clerk]);

  return null;
}

function BackgroundSyncRegistrar() {
  useEffect(() => {
    registerBackgroundSync();
    registerForPushNotifications();
  }, []);
  return null;
}

const tokenCache = {
  getToken: async (key: string) => SecureStore.getItemAsync(key),
  saveToken: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteToken: async (key: string) => SecureStore.deleteItemAsync(key),
};

function FontGate({ children }: { children: React.ReactNode }) {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) {
    // Native splash stays visible until every brand font resolves.
    return null;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FontGate>
        <I18nextProvider i18n={i18n}>
          <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
            <QueryClientProvider client={queryClient}>
              <SafeAreaProvider>
                <ClerkInstanceSetter />
                <QueryCachePersistor />
                <AppStateRefresh />
                <BackgroundSyncRegistrar />
                <AppNavigator />
                <OfflineBanner />
                <Toast config={toastConfig} position="top" visibilityTime={3000} topOffset={56} />
              </SafeAreaProvider>
            </QueryClientProvider>
          </ClerkProvider>
        </I18nextProvider>
      </FontGate>
    </GestureHandlerRootView>
  );
}
