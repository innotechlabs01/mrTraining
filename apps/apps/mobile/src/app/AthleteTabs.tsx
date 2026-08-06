import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { TodayScreen } from '../features/training/presentation/screens/TodayScreen';
import { HistoryScreen } from '../features/training/presentation/screens/HistoryScreen';
import { NutritionScreen } from '../features/nutrition/presentation/screens/NutritionScreen';
import { RecoveryScreen } from '../features/recovery/presentation/screens/RecoveryScreen';
import { ProfileScreen } from '../features/auth/presentation/screens/ProfileScreen';

type AthleteTabParamList = {
  Today: undefined;
  Training: undefined;
  Nutrition: undefined;
  Recovery: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AthleteTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Today: '🏋️', Training: '📊', Nutrition: '🥗', Recovery: '💤', Profile: '👤',
  };
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[label] ?? '•'}</Text>;
}

export function AthleteTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#98989D',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#38383A',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Training" component={HistoryScreen} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen name="Recovery" component={RecoveryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
