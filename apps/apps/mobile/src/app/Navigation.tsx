import React from 'react';
import { Linking, Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useUser, ClerkLoaded } from '@clerk/clerk-expo';
import { SignInScreen } from '../features/auth/presentation/screens/SignInScreen';
import { InviteAcceptScreen } from '../features/auth/presentation/screens/InviteAcceptScreen';
import { MembershipGate } from '../features/membership/presentation/MembershipGate';
import { AthleteTabs } from './AthleteTabs';

const API_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://mrtraining.vercel.app';

// Extract token from deep link URL
// Supports: mrtraining://invite?token=xxx
//           https://app.mrtraining.com/invite?token=xxx
function extractTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('token');
  } catch {
    // Fallback for custom scheme: mrtraining://invite?token=xxx
    const match = url.match(/[?&]token=([^&]+)/);
    return match ? match[1] : null;
  }
}

const linking = {
  prefixes: ['mrtraining://', 'https://app.mrtraining.com'],
  config: {
    screens: {
      InviteAccept: 'invite',
      Auth: 'auth',
      AthleteTabs: 'home',
    },
  },
  async getInitialURL(): Promise<string | null> {
    const url = await Linking.getInitialURL();
    if (url != null) return url;
    return null;
  },
  subscribe(listener: (url: string) => void) {
    const sub = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => sub.remove();
  },
  // Custom function to extract params from URL
  getStateFromPath(path: string, config: Record<string, unknown>) {
    // Parse the path and extract token if present
    const token = extractTokenFromUrl(path);
    if (token) {
      return {
        routes: [
          {
            name: 'InviteAccept',
            params: { token },
          },
        ],
      };
    }
    return undefined;
  },
};

export type RootStackParamList = {
  Auth: undefined;
  InviteAccept: { token: string } | undefined;
  AthleteTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AthleteTabsWithGate() {
  const { user } = useUser();
  return (
    <MembershipGate athleteId={user?.id ?? null}>
      <AthleteTabs />
    </MembershipGate>
  );
}

function useNavigation() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={SignInScreen} />
        <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
      </Stack.Navigator>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
      <Stack.Screen name="AthleteTabs" component={AthleteTabsWithGate} />
    </Stack.Navigator>
  );
}

function NavigationContent() {
  const navigation = useNavigationContainerRef<RootStackParamList>();

  return useNavigation();
}

export function AppNavigator() {
  return (
    <ClerkLoaded>
      <NavigationContainer linking={linking}>
        <NavigationContent />
      </NavigationContainer>
    </ClerkLoaded>
  );
}
