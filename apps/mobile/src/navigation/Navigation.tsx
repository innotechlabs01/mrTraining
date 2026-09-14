import React, { useCallback } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useUser, ClerkLoaded } from '@clerk/clerk-expo';
import { SplashScreen } from '../features/auth/presentation/screens/SplashScreen';
import { OnboardingSlidersScreen } from '../features/auth/presentation/screens/OnboardingSlidersScreen';
import { WelcomeScreen } from '../features/auth/presentation/screens/WelcomeScreen';
import { SignInScreen } from '../features/auth/presentation/screens/SignInScreen';
import { InviteAcceptScreen } from '../features/auth/presentation/screens/InviteAcceptScreen';
import { OnboardingScreen, OnboardingData } from '../features/auth/presentation/screens/OnboardingScreen';
import { MembershipGate } from '../features/membership/presentation/MembershipGate';
import { MembershipScreen } from '../features/membership/presentation/screens/MembershipScreen';
import { StoreScreen } from '../features/store/presentation/screens/StoreScreen';
import { EventDetailScreen } from '../features/events/presentation/screens/EventDetailScreen';
import { WorkoutDetailScreen } from '../features/training/presentation/screens/WorkoutDetailScreen';
import { WorkoutExecutionScreen } from '../features/training/presentation/screens/WorkoutExecutionScreen';
import { AiWorkoutScreen } from '../features/ai/presentation/screens/AiWorkoutScreen';
import { ImportHistoryScreen } from '../features/training/presentation/screens/ImportHistoryScreen';
import { SearchScreen } from '../features/search/presentation/screens/SearchScreen';
import { SettingsScreen } from '../features/settings/presentation/screens/SettingsScreen';
import { NotificationSettingsScreen } from '../features/settings/presentation/screens/NotificationSettingsScreen';
import { PasswordSettingsScreen } from '../features/settings/presentation/screens/PasswordSettingsScreen';
import { FavoritesScreen } from '../features/favorites/presentation/screens/FavoritesScreen';
import { HelpScreen } from '../features/help/presentation/screens/HelpScreen';
import { NotificationsScreen } from '../features/notifications/presentation/screens/NotificationsScreen';
import { WorkoutListScreen } from '../features/training/presentation/screens/WorkoutListScreen';
import { ProgressScreen } from '../features/progress/presentation/screens/ProgressScreen';
import { NutritionScreen } from '../features/nutrition/presentation/screens/NutritionScreen';
import { CommunityScreen } from '../features/community/presentation/screens/CommunityScreen';
import { ArticlesScreen } from '../features/community/presentation/screens/ArticlesScreen';
import { ArticleDetailScreen } from '../features/community/presentation/screens/ArticleDetailScreen';
import { WeeklyChallengeScreen } from '../features/community/presentation/screens/WeeklyChallengeScreen';
import { MealDetailScreen } from '../features/nutrition/presentation/screens/MealDetailScreen';
import { CreateRoutineScreen } from '../features/training/presentation/screens/CreateRoutineScreen';
import { DiscussionForumScreen } from '../features/community/presentation/screens/DiscussionForumScreen';
import { ChallengeDetailScreen } from '../features/community/presentation/screens/ChallengeDetailScreen';
import { ChallengeRecordingScreen } from '../features/community/presentation/screens/ChallengeRecordingScreen';
import { LeaderboardScreen } from '../features/community/presentation/screens/LeaderboardScreen';
import { AthleteTabs } from './AthleteTabs';
import { darkTheme } from '../shared/theme/navigationTheme';

// --- Deep Linking ---
function extractCodeFromUrl(url: string): string | null {
  try {
    const normalizedUrl = url.replace('/--/', '/');
    const urlObj = new URL(normalizedUrl);
    return urlObj.searchParams.get('code');
  } catch {
    const match = url.match(/[?&]code=([^&]+)/);
    return match ? match[1] : null;
  }
}

const linking = {
  prefixes: [
    'mrtraining://',
    'exp://',
    'exp+mrtraining://',
    'exp://localhost',
    'https://mobile.innotechlabssas.lat',
  ],
  config: {
    screens: {
      Splash: '',
      Sliders: 'sliders',
      Welcome: 'welcome',
      Auth: 'auth',
      Onboarding: 'onboarding',
      InviteAccept: 'invite',
      AthleteTabs: 'home',
      Membership: 'membership',
      Store: 'store',
    },
  },
  async getInitialURL(): Promise<string> {
    const url = await Linking.getInitialURL();
    return url ?? '';
  },
  subscribe(listener: (url: string) => void) {
    const sub = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => sub.remove();
  },
  getStateFromPath(path: string) {
    const normalizedPath = path.replace('/--/', '/');
    const code = extractCodeFromUrl(normalizedPath);
    if (code) {
      return {
        routes: [{ name: 'InviteAccept' as const, params: { code } }],
      };
    }
    return undefined;
  },
};

// --- Types ---
export type RootStackParamList = {
  Splash: undefined;
  Sliders: undefined;
  Welcome: undefined;
  Auth: { code?: string; mode?: 'signin' | 'signup'; onboardingData?: OnboardingData } | undefined;
  Onboarding: undefined;
  InviteAccept: { code: string } | undefined;
  AthleteTabs: undefined;
  Membership: undefined;
  Store: undefined;
  WorkoutDetail: { workoutId: string };
  WorkoutExecution: { sessionId: string; workoutId: string };
  AiWorkout: { sessionId: string; workoutId: string; exerciseId: string; target: number };
  EventDetail: { eventId: string };
  ImportHistory: undefined;
  Search: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PasswordSettings: undefined;
  Favorites: undefined;
  Help: undefined;
  Notifications: undefined;
  Workouts: undefined;
  Progress: undefined;
  Nutrition: undefined;
  Community: undefined;
  Articles: undefined;
  ArticleDetail: { id: string };
  WeeklyChallenge: undefined;
  MealDetail: { name?: string; calories?: number; time?: string };
  CreateRoutine: undefined;
  DiscussionForum: undefined;
  ChallengeDetail: { challengeId: string };
  Leaderboard: { challengeId: string };
  ChallengeRecording: { challengeId: string; attemptId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// --- Wrappers ---
function AthleteTabsWithGate() {
  const { user } = useUser();
  return (
    <MembershipGate athleteId={user?.id ?? null}>
      <AthleteTabs />
    </MembershipGate>
  );
}

function WelcomeScreenWrapper({ navigation }: any) {
  return (
    <WelcomeScreen
      onNewUser={() => navigation.navigate('Onboarding')}
      onExistingUser={() => navigation.navigate('Auth', { mode: 'signin' })}
    />
  );
}

function OnboardingScreenWrapper({ navigation }: any) {
  const handleComplete = useCallback(
    (data: OnboardingData) => navigation.navigate('Auth', { mode: 'signup', onboardingData: data }),
    [navigation],
  );
  return <OnboardingScreen onComplete={handleComplete} />;
}

// --- Root Navigator (single navigator, conditional screens) ---
function RootNavigator() {
  const { isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  // Show loading while Clerk initializes
  if (!userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkTheme.colors.background }}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
      </View>
    );
  }

  // Force remount when auth state changes — this resets navigation state
  const navKey = isSignedIn ? 'signed-in' : 'auth';

  return (
    <Stack.Navigator key={navKey} screenOptions={{ headerShown: false }}>
      {!isSignedIn ? (
        // Auth stack
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Sliders" component={OnboardingSlidersScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreenWrapper} />
          <Stack.Screen name="Auth" component={SignInScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreenWrapper} />
          <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
        </>
      ) : (
        // Signed-in stack
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="AthleteTabs" component={AthleteTabsWithGate} />
          <Stack.Screen name="Membership" component={MembershipScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="Store" component={StoreScreen} />
          <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen name="WorkoutExecution" component={WorkoutExecutionScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="AiWorkout" component={AiWorkoutScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="ImportHistory" component={ImportHistoryScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="PasswordSettings" component={PasswordSettingsScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Workouts" component={WorkoutListScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="Nutrition" component={NutritionScreen} />
          <Stack.Screen name="Community" component={CommunityScreen} />
          <Stack.Screen name="Articles" component={ArticlesScreen} />
          <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
          <Stack.Screen name="WeeklyChallenge" component={WeeklyChallengeScreen} />
          <Stack.Screen name="MealDetail" component={MealDetailScreen} />
          <Stack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
          <Stack.Screen name="DiscussionForum" component={DiscussionForumScreen} />
          <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="ChallengeRecording" component={ChallengeRecordingScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

// --- Main Navigator ---
export function AppNavigator() {
  return (
    <ClerkLoaded>
      <NavigationContainer linking={linking} theme={darkTheme}>
        <RootNavigator />
      </NavigationContainer>
    </ClerkLoaded>
  );
}
