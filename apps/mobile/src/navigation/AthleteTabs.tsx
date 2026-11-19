import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GlassDock } from '../shared/components/ui/GlassDock';

export type AthleteTabParamList = {
  Today: undefined;
  History: undefined;
  Events: undefined;
  Recovery: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AthleteTabParamList>();

// Pantallas del tab cargadas bajo demanda (lazy) para mantener el bundle
// inicial del tab ligero. Cada pantalla pesada se resuelve solo cuando el
// atleta navega a esa pestaña.
export function AthleteTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassDock {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Today"
        getComponent={() =>
          require('../features/training/presentation/screens/TodayScreen').TodayScreen
        }
      />
      <Tab.Screen
        name="History"
        getComponent={() =>
          require('../features/training/presentation/screens/HistoryScreen').HistoryScreen
        }
      />
      <Tab.Screen
        name="Events"
        getComponent={() =>
          require('../features/events/presentation/screens/EventsScreen').EventsScreen
        }
      />
      <Tab.Screen
        name="Recovery"
        getComponent={() =>
          require('../features/recovery/presentation/screens/RecoveryScreen').RecoveryScreen
        }
      />
      <Tab.Screen
        name="Profile"
        getComponent={() =>
          require('../features/auth/presentation/screens/ProfileScreen').ProfileScreen
        }
      />
    </Tab.Navigator>
  );
}
