import React, { useCallback } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useUser, ClerkProvider } from '@clerk/clerk-react';
import Constants from 'expo-constants';
import { SplashScreen } from '../features/auth/presentation/screens/SplashScreen';
import { OnboardingSlidersScreen } from '../features/auth/presentation/screens/OnboardingSlidersScreen';
import { WelcomeScreen } from '../features/auth/presentation/screens/WelcomeScreen';
import { SignInScreen } from '../features/auth/presentation/screens/SignInScreen';
import { InviteAcceptScreen } from '../features/auth/presentation/screens/InviteAcceptScreen';
import { OnboardingScreen, OnboardingData } from '../features/auth/presentation/screens/OnboardingScreen';
import { MembershipGate } from '../features/membership/presentation/MembershipGate';
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
  Auth: { code?: string | undefined; mode?: 'signin' | 'signup' | undefined; onboardingData?: OnboardingData | undefined } | undefined;
  Onboarding: undefined;
  InviteAccept: { code: string } | undefined;
  AthleteTabs: undefined;
  Membership: undefined;
  Store: undefined;
  WorkoutDetail: { workoutId: string };
  WorkoutExecution: { sessionId: string; workoutId: string };
  AiWorkout: {
    sessionId: string;
    workoutId: string;
    exerciseId: string;
    target: number;
    /** Workout exercise row id; lets the session report results back to execution. */
    exerciseDbId?: string;
  };
  EventDetail: { eventId: string };
  ImportHistory: undefined;
  Search: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  PasswordSettings: undefined;
  PersonalData: undefined;
  TrainingPreferences: undefined;
  EmergencyContact: undefined;
  Favorites: undefined;
  Help: undefined;
  MyTickets: undefined;
  CreateTicket: undefined;
  TicketChat: { ticketId: string };
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
  CoachChallenges: undefined;
  CreateChallenge: undefined;
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

function WelcomeScreenWrapper({ navigation }: NativeStackScreenProps<RootStackParamList, 'Welcome'>) {
  return (
    <WelcomeScreen
      onNewUser={() => navigation.navigate('Onboarding')}
      onExistingUser={() => navigation.navigate('Auth', { mode: 'signin' })}
    />
  );
}

function OnboardingScreenWrapper({ navigation }: NativeStackScreenProps<RootStackParamList, 'Onboarding'>) {
  const handleComplete = useCallback(
    (data: OnboardingData) => navigation.navigate('Auth', { mode: 'signup', onboardingData: data }),
    [navigation],
  );
  return <OnboardingScreen onComplete={handleComplete} />;
}

// --- Root Navigator (single navigator, conditional screens) ---
function RootNavigator() {
  const { isSignedIn } = useAuth();
  const { isLoaded: userLoaded } = useUser();

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
          <Stack.Screen
            name="Membership"
            getComponent={() => require('../features/membership/presentation/screens/MembershipScreen').MembershipScreen}
          />
          <Stack.Screen
            name="EventDetail"
            getComponent={() => require('../features/events/presentation/screens/EventDetailScreen').EventDetailScreen}
          />
          <Stack.Screen
            name="Store"
            getComponent={() => require('../features/store/presentation/screens/StoreScreen').StoreScreen}
          />
          <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
          <Stack.Screen
            name="WorkoutDetail"
            getComponent={() => require('../features/training/presentation/screens/WorkoutDetailScreen').WorkoutDetailScreen}
          />
          <Stack.Screen
            name="WorkoutExecution"
            getComponent={() => require('../features/training/presentation/screens/WorkoutExecutionScreen').WorkoutExecutionScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="AiWorkout"
            getComponent={() => require('../features/ai/presentation/screens/AiWorkoutScreen').AiWorkoutScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="ImportHistory"
            getComponent={() => require('../features/training/presentation/screens/ImportHistoryScreen').ImportHistoryScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Search"
            getComponent={() => require('../features/search/presentation/screens/SearchScreen').SearchScreen}
          />
          <Stack.Screen
            name="Settings"
            getComponent={() => require('../features/settings/presentation/screens/SettingsScreen').SettingsScreen}
          />
          <Stack.Screen
            name="NotificationSettings"
            getComponent={() => require('../features/settings/presentation/screens/NotificationSettingsScreen').NotificationSettingsScreen}
          />
          <Stack.Screen
            name="PasswordSettings"
            getComponent={() => require('../features/settings/presentation/screens/PasswordSettingsScreen').PasswordSettingsScreen}
          />
          <Stack.Screen
            name="PersonalData"
            getComponent={() => require('../features/auth/presentation/screens/PersonalDataScreen').PersonalDataScreen}
          />
          <Stack.Screen
            name="TrainingPreferences"
            getComponent={() => require('../features/auth/presentation/screens/TrainingPreferencesScreen').TrainingPreferencesScreen}
          />
          <Stack.Screen
            name="EmergencyContact"
            getComponent={() => require('../features/auth/presentation/screens/EmergencyContactScreen').EmergencyContactScreen}
          />
          <Stack.Screen
            name="Favorites"
            getComponent={() => require('../features/favorites/presentation/screens/FavoritesScreen').FavoritesScreen}
          />
          <Stack.Screen
            name="Help"
            getComponent={() => require('../features/help/presentation/screens/HelpScreen').HelpScreen}
          />
          <Stack.Screen
            name="MyTickets"
            getComponent={() => require('../features/support/presentation/screens/MyTicketsScreen').MyTicketsScreen}
          />
          <Stack.Screen
            name="CreateTicket"
            getComponent={() => require('../features/support/presentation/screens/CreateTicketScreen').CreateTicketScreen}
          />
          <Stack.Screen
            name="TicketChat"
            getComponent={() => require('../features/support/presentation/screens/TicketChatScreen').TicketChatScreen}
          />
          <Stack.Screen
            name="Notifications"
            getComponent={() => require('../features/notifications/presentation/screens/NotificationsScreen').NotificationsScreen}
          />
          <Stack.Screen
            name="Workouts"
            getComponent={() => require('../features/training/presentation/screens/WorkoutListScreen').WorkoutListScreen}
          />
          <Stack.Screen
            name="Progress"
            getComponent={() => require('../features/progress/presentation/screens/ProgressScreen').ProgressScreen}
          />
          <Stack.Screen
            name="Nutrition"
            getComponent={() => require('../features/nutrition/presentation/screens/NutritionScreen').NutritionScreen}
          />
          <Stack.Screen
            name="Community"
            getComponent={() => require('../features/community/presentation/screens/CommunityScreen').CommunityScreen}
          />
          <Stack.Screen
            name="Articles"
            getComponent={() => require('../features/community/presentation/screens/ArticlesScreen').ArticlesScreen}
          />
          <Stack.Screen
            name="ArticleDetail"
            getComponent={() => require('../features/community/presentation/screens/ArticleDetailScreen').ArticleDetailScreen}
          />
          <Stack.Screen
            name="WeeklyChallenge"
            getComponent={() => require('../features/community/presentation/screens/WeeklyChallengeScreen').WeeklyChallengeScreen}
          />
          <Stack.Screen
            name="MealDetail"
            getComponent={() => require('../features/nutrition/presentation/screens/MealDetailScreen').MealDetailScreen}
          />
          <Stack.Screen
            name="CreateRoutine"
            getComponent={() => require('../features/training/presentation/screens/CreateRoutineScreen').CreateRoutineScreen}
          />
          <Stack.Screen
            name="DiscussionForum"
            getComponent={() => require('../features/community/presentation/screens/DiscussionForumScreen').DiscussionForumScreen}
          />
          <Stack.Screen
            name="ChallengeDetail"
            getComponent={() => require('../features/community/presentation/screens/ChallengeDetailScreen').ChallengeDetailScreen}
          />
          <Stack.Screen
            name="Leaderboard"
            getComponent={() => require('../features/community/presentation/screens/LeaderboardScreen').LeaderboardScreen}
          />
          <Stack.Screen
            name="ChallengeRecording"
            getComponent={() => require('../features/community/presentation/screens/ChallengeRecordingScreen').ChallengeRecordingScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="CoachChallenges"
            getComponent={() => require('../features/coaching/presentation/screens/CoachChallengesScreen').CoachChallengesScreen}
          />
          <Stack.Screen
            name="CreateChallenge"
            getComponent={() => require('../features/coaching/presentation/screens/CreateChallengeScreen').CreateChallengeScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

// --- Main Navigator ---
export function AppNavigator() {
  return (
    <ClerkProvider apiKey={process.env.CLERK_PUBLISH_KEY || Constants.expoConfig?.extra?.clerkPublishableKey || "pk_test_dXByaWdodC1tYXJ0ZW4tNjQuY2xlcmsuYWNjb3VudHMuZGV2JA"}>
      <NavigationContainer linking={linking} theme={darkTheme}>
        <RootNavigator />
      </NavigationContainer>
    </ClerkProvider>
  );
}
