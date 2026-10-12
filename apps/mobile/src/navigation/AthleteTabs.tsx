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
  History: undefined;
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
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Recovery" component={RecoveryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
