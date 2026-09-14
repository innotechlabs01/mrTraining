import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TodayScreen } from '../features/training/presentation/screens/TodayScreen';
import { HistoryScreen } from '../features/training/presentation/screens/HistoryScreen';
import { EventsScreen } from '../features/events/presentation/screens/EventsScreen';
import { ProfileScreen } from '../features/auth/presentation/screens/ProfileScreen';
import { RecoveryScreen } from '../features/recovery/presentation/screens/RecoveryScreen';
import { GlassDock } from '../shared/components/ui/GlassDock';

export type AthleteTabParamList = {
  Today: undefined;
  Plan: undefined;
  Events: undefined;
  Recovery: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AthleteTabParamList>();

export function AthleteTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassDock {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: 'Hoy' }} />
      <Tab.Screen name="Plan" component={HistoryScreen} options={{ tabBarLabel: 'Plan' }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ tabBarLabel: 'Eventos' }} />
      <Tab.Screen name="Recovery" component={RecoveryScreen} options={{ tabBarLabel: 'Recuperación' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
