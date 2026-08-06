import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppNavigator } from './Navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const CLERK_PUBLISHABLE_KEY = __DEV__
  ? 'pk_test_dXByaWdodC1tYXJ0ZW4tNjQuY2xlcmsuYWNjb3VudHMuZGV2JA'
  : process.env.CLERK_PUBLISHABLE_KEY ?? '';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
