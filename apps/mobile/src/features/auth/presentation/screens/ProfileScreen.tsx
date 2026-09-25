/**
 * ProfileScreen — athlete profile container (compact).
 *
 * Renders a slim identity header plus settings-style module groups that open
 * child screens (PersonalData / TrainingPreferences / EmergencyContact).
 * Container owns the profile query, link navigation and sign out.
 */
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import {
  MembershipIcon,
  StoreIcon,
  StarIcon,
  LockIcon,
  GearIcon,
  HelpIcon,
  LogoutIcon,
  UserIcon,
  BarbellIcon,
  ClockIcon,
  HeartPulseIcon,
} from '../../../../shared/components/icons';
import { ProfileHeader } from './ProfileHeader';
import { ProfileMenu } from './ProfileMenu';
import { profileScheduleRaw, scheduleSummary, modalityLabel, useAthleteProfile } from '../../application/useAthleteProfile';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data: profile } = useAthleteProfile();

  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const openMembership = () => rootNav?.navigate('Membership');
  const openStore = () => rootNav?.navigate('Store');
  const openSettings = () => rootNav?.navigate('Settings');
  const openHelp = () => rootNav?.navigate('Help');
  const openPersonalData = () => rootNav?.navigate('PersonalData');
  const openTrainingPreferences = () => rootNav?.navigate('TrainingPreferences');
  const openEmergencyContact = () => rootNav?.navigate('EmergencyContact');

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName[0].toUpperCase()
        : 'AT';

  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const displayName =
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ??
    profile?.name ??
    '—';
  const displayEmail = email || profile?.email || '—';
  const planName = profile?.plan?.name ?? null;
  const schedule = profile ? profileScheduleRaw(profile) : { days: '', time: '' };

  const handleSignOut = () => {
    Alert.alert('Cerrar Sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handlePrivacyPolicy = async () => {
    const url = 'https://mr-training.com/privacy';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else Alert.alert('Política de Privacidad', 'Próximamente');
    } catch {
      Alert.alert('Política de Privacidad', 'Próximamente');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <ProfileHeader
          initials={initials}
          name={displayName}
          email={displayEmail}
          plan={planName}
        />

        <View style={styles.sectionWrap}>
          <ProfileMenu
            title="Mis datos"
            items={[
              {
                key: 'personal',
                label: 'Información personal',
                icon: <UserIcon size={18} color={colors.primary} />,
                onPress: openPersonalData,
              },
              {
                key: 'modality',
                label: 'Modo de entrenamiento',
                icon: <BarbellIcon size={18} color={colors.primary} />,
                value: profile ? modalityLabel(profile.modality ?? profile.service_type ?? profile.serviceType) : '—',
                onPress: openTrainingPreferences,
              },
              {
                key: 'schedule',
                label: 'Horario de entrenamiento',
                icon: <ClockIcon size={18} color={colors.primary} />,
                value: profile ? scheduleSummary(schedule.days, schedule.time) : '—',
                onPress: openTrainingPreferences,
              },
              {
                key: 'emergency',
                label: 'Contacto de emergencia',
                icon: <HeartPulseIcon size={18} color={colors.primary} />,
                value: profile?.emergency_contact ?? undefined,
                onPress: openEmergencyContact,
              },
            ]}
          />
        </View>

        <View style={styles.sectionWrap}>
          <ProfileMenu
            title="Mi cuenta"
            items={[
              {
                key: 'membership',
                label: 'Membresía',
                icon: <MembershipIcon size={18} color={colors.primary} />,
                value: profile?.plan?.name ?? undefined,
                onPress: openMembership,
              },
              { key: 'store', label: 'Tienda', icon: <StoreIcon size={18} color={colors.primary} />, onPress: openStore },
              { key: 'favorites', label: 'Favoritos', icon: <StarIcon size={18} color={colors.primary} />, onPress: openStore },
              { key: 'settings', label: 'Ajustes', icon: <GearIcon size={18} color={colors.primary} />, onPress: openSettings },
              { key: 'privacy', label: 'Política de Privacidad', icon: <LockIcon size={18} color={colors.primary} />, onPress: handlePrivacyPolicy },
              { key: 'help', label: 'Ayuda', icon: <HelpIcon size={18} color={colors.primary} />, onPress: openHelp },
            ]}
          />
        </View>

        <View style={styles.sectionWrap}>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión de tu cuenta"
          >
            <LogoutIcon size={18} color={colors.error} />
            <Text style={styles.signOutText}>Cerrar Sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scrollContent: { paddingBottom: spacing.xl },
  sectionWrap: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  pressed: { opacity: 0.8 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: spacing.lg * 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
    backgroundColor: `${colors.error}14`,
  },
  signOutText: { ...typography.bodyStrong, color: colors.error },
});