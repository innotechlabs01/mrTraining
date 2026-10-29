/**
 * ProfileScreen — athlete profile container (compact).
 *
 * Renders a slim identity header plus settings-style module groups that open
 * child screens (PersonalData / TrainingPreferences / EmergencyContact).
 * Container owns the profile query, link navigation and sign out.
 */
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
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
import { unregisterPushToken } from '../../../../infrastructure/notifications/push';
import { profileScheduleRaw, scheduleSummary, modalityLabel, useAthleteProfile } from '../../application/useAthleteProfile';
import { getMembershipStatus } from '../../services/membershipService';
import { listStore, type StoreProduct } from '../../../store/storeService';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.profileScreen;

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data: profile } = useAthleteProfile();
  const [membershipDays, setMembershipDays] = useState<number | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getMembershipStatus().then((membership) => {
      setMembershipDays(membership.daysRemaining ?? null);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setStoreLoading(true);
    listStore().then((products) => {
      setStoreProducts(products);
      setStoreLoading(false);
    }).catch(() => setStoreLoading(false));
  }, [user?.id]);

  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const openMembership = () => rootNav?.navigate('Membership');
  const openStore = () => rootNav?.navigate('Store');
  const openFavorites = () => rootNav?.navigate('Favorites');
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
    Alert.alert(t.signOutLabel, t.signOutConfirm, [
      { text: texts.common.cancel, style: 'cancel' },
      {
        text: t.signOutLabel,
        style: 'destructive',
        // Unregister the push token while the Clerk session token is still valid.
        onPress: () => {
          void unregisterPushToken().finally(() => signOut());
        },
      },
    ]);
  };

  const handlePrivacyPolicy = async () => {
    const url = 'https://mr-training.com/privacy';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else Alert.alert(t.privacyLabel, t.privacyComingSoon);
    } catch {
      Alert.alert(t.privacyLabel, t.privacyComingSoon);
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
            title={t.myDataTitle}
            items={[
              {
                key: 'personal',
                label: t.personalInfoLabel,
                icon: <UserIcon size={18} color={colors.primarySoft} />,
                onPress: openPersonalData,
              },
              {
                key: 'modality',
                label: t.modalityLabel,
                icon: <BarbellIcon size={18} color={colors.primarySoft} />,
                value: profile ? modalityLabel(profile.modality ?? profile.service_type ?? profile.serviceType) : '—',
                onPress: openTrainingPreferences,
              },
              {
                key: 'schedule',
                label: t.scheduleLabel,
                icon: <ClockIcon size={18} color={colors.primarySoft} />,
                value: profile ? scheduleSummary(schedule.days, schedule.time) : '—',
                onPress: openTrainingPreferences,
              },
              {
                key: 'emergency',
                label: t.emergencyLabel,
                icon: <HeartPulseIcon size={18} color={colors.primarySoft} />,
                value: profile?.emergency_contact ?? undefined,
                onPress: openEmergencyContact,
              },
            ]}
          />
        </View>

        <View style={styles.sectionWrap}>
          <ProfileMenu
            title={t.myAccountTitle}
            items={[
              {
                key: 'membership',
                label: t.membershipLabel,
                icon: <MembershipIcon size={18} color={colors.primarySoft} />,
                value: `${profile?.plan?.name ?? ''}${membershipDays != null && membershipDays > 0 ? ` · ${membershipDays} días restantes` : ''}` || undefined,
                onPress: openMembership,
              },
              { key: 'store', label: t.storeLabel, icon: <StoreIcon size={18} color={colors.primarySoft} />, onPress: openStore },
              { key: 'favorites', label: t.favoritesLabel, icon: <StarIcon size={18} color={colors.primarySoft} />, onPress: openFavorites },
              { key: 'settings', label: t.settingsLabel, icon: <GearIcon size={18} color={colors.primarySoft} />, onPress: openSettings },
              { key: 'privacy', label: t.privacyLabel, icon: <LockIcon size={18} color={colors.primarySoft} />, onPress: handlePrivacyPolicy },
              { key: 'help', label: t.helpLabel, icon: <HelpIcon size={18} color={colors.primarySoft} />, onPress: openHelp },
            ]}
          />
        </View>

        <View style={styles.sectionWrap}>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel={t.signOutA11y}
          >
            <LogoutIcon size={18} color={colors.error} />
            <Text style={styles.signOutText}>{t.signOutLabel}</Text>
          </Pressable>
        </View>

        {/* Tienda del coach — sección inline en el perfil del atleta */}
        <View style={styles.sectionWrap}>
          <Text style={styles.groupTitle}>{t.storeTitle}</Text>
          {storeLoading ? (
            <View style={styles.storeLoading}>
              <Text style={styles.captionText}>{t.storeLoadingLabel}</Text>
            </View>
          ) : storeProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t.storeEmptyLabel}</Text>
            </View>
          ) : (
            <View style={styles.storeGrid}>
              {storeProducts.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => rootNav?.navigate('Store')}
                  style={styles.storeCard}
                >
                  {p.image_url ? (
                    <Image
                      source={{ uri: p.image_url }}
                      style={styles.storeImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.storeImagePlaceholder}>
                      <StoreIcon size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.storePrice}>
                      ${Number(p.price).toFixed(2)}
                    </Text>
                    {p.stock !== undefined && p.stock <= 0 && (
                      <Text style={styles.storeOutOfStock}>{t.storeOutOfStock}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
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

  /* Tienda del coach — sección inline en perfil del atleta */
  storeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  captionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  storeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  storeCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  storeImage: {
    width: '100%',
    height: 96,
  },
  storeImagePlaceholder: {
    width: '100%',
    height: 96,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    padding: spacing.sm,
  },
  storeName: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  storePrice: {
    ...typography.title,
    color: colors.primary,
    fontSize: 16,
    marginBottom: 4,
  },
  storeOutOfStock: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
  },
});