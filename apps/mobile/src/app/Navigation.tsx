import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useUser, ClerkLoaded } from '@clerk/clerk-react-native';
import { SignInScreen } from '../features/auth/presentation/screens/SignInScreen';
import { MembershipGate } from '../features/membership/presentation/MembershipGate';
import { AthleteTabs } from './AthleteTabs';

export type RootStackParamList = {
  Auth: undefined;
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
      <Stack.Screen name="AthleteTabs" component={AthleteTabsWithGate} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <ClerkLoaded>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </ClerkLoaded>
  );
}

function Navigation() {
  return useNavigation();
}
