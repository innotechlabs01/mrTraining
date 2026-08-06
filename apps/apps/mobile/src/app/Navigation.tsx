import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useUser, ClerkLoaded } from '@clerk/clerk-react-native';

import { SplashScreen } from '../features/auth/presentation/screens/SplashScreen';
import { WelcomeScreen } from '../features/auth/presentation/screens/WelcomeScreen';
import { OnboardingScreen } from '../features/auth/presentation/screens/OnboardingScreen';
import type { OnboardingData } from '../features/auth/presentation/screens/OnboardingScreen';
import { SignInScreen } from '../features/auth/presentation/screens/SignInScreen';
import { MembershipGate } from '../features/membership/presentation/MembershipGate';
import { AthleteTabs } from './AthleteTabs';

type FlowStep = 'splash' | 'welcome' | 'onboarding' | 'signin' | 'app';

export type RootStackParamList = {
  Auth: undefined;
  AthleteTabs: undefined;
};

function AthleteTabsWithGate() {
  const { user } = useUser();
  return (
    <MembershipGate athleteId={user?.id ?? null}>
      <AthleteTabs />
    </MembershipGate>
  );
}

function AuthFlow() {
  const [step, setStep] = useState<FlowStep>('splash');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  const handleSplashDone = () => setStep('welcome');
  const handleNewUser = () => setStep('onboarding');
  const handleExistingUser = () => setStep('signin');
  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setStep('signin');
  };

  if (step === 'splash') return <SplashScreen onFinish={handleSplashDone} />;
  if (step === 'welcome') return <WelcomeScreen onNewUser={handleNewUser} onExistingUser={handleExistingUser} />;
  if (step === 'onboarding') return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  return <SignInScreen />;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  return (
    <ClerkLoaded>
      <NavigationContainer>
        {!isSignedIn ? (
          <AuthFlow />
        ) : !user ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#FF6B00" />
          </View>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AthleteTabs" component={AthleteTabsWithGate} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </ClerkLoaded>
  );
}
