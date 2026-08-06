import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './Navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 1 },
  },
});

const CLERK_KEY = 'pk_test_dXByaWdodC1tYXJ0ZW4tNjQuY2xlcmsuYWNjb3VudHMuZGV2JA';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={CLERK_KEY}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
