import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClerkProvider, useClerk } from '@clerk/clerk-expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './Navigation';
import { setClerkInstance } from '../infrastructure/auth/clerk';
import { useAppFonts } from '../shared/theme/fonts';
import { registerBackgroundSync } from '../infrastructure/health/background-sync';
import { registerForPushNotifications } from '../infrastructure/notifications/push';
import Toast, { toastConfig } from '../shared/components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 1000 * 60 * 30,
    },
    mutations: { retry: 1 },
  },
});

persistQueryClient({
  queryClient,
  persister: {
    persistClient: async (client) => {
      await AsyncStorage.setItem('react-query-cache', JSON.stringify(client));
    },
    restoreClient: async () => {
      const cache = await AsyncStorage.getItem('react-query-cache');
      return cache ? (JSON.parse(cache) as PersistedClient) : undefined;
    },
    removeClient: async () => {
      await AsyncStorage.removeItem('react-query-cache');
    },
  },
  maxAge: 1000 * 60 * 60 * 24,
});

// Hold the native splash until FontGate hides it after fonts resolve.
// Runs at module scope so it executes before the first render, even if the
// Clerk key check below throws.
SplashScreen.preventAutoHideAsync().catch(() => {});

const CLERK_KEY = Constants.expoConfig?.extra?.clerkPublishableKey;

if (!CLERK_KEY) {
  throw new Error('Missing clerkPublishableKey in app.json extra');
}

function ClerkInstanceSetter() {
  const clerk = useClerk();

  useEffect(() => {
    setClerkInstance(clerk);
  }, [clerk]);

  return null;
}

function AppStateRefresh() {
  const clerk = useClerk();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && clerk.session) {
        // Silent pre-emptive refresh, ignore errors
        clerk.session.getToken({ skipCache: true }).catch(() => {});
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
        <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <ClerkInstanceSetter />
              <AppStateRefresh />
              <BackgroundSyncRegistrar />
              <AppNavigator />
              <Toast config={toastConfig} position="top" visibilityTime={3000} topOffset={56} />
            </SafeAreaProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </FontGate>
    </GestureHandlerRootView>
  );
}
