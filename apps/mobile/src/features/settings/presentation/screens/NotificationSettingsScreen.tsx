import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ArrowLeftIcon, BarbellIcon, BellIcon, ChatIcon, ChartBarIcon, FireIcon } from '../../../../shared/components/icons';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type NotificationType = {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
};

const NOTIFICATION_TYPES: NotificationType[] = [
  { key: 'workoutReminders', icon: <BarbellIcon size={18} color={colors.text} />, label: 'Recordatorios de entrenamiento', description: 'Recibe notificaciones cuando se asigna un entrenamiento' },
  { key: 'weeklyChallenges', icon: <FireIcon size={18} color={colors.text} />, label: 'Desafíos semanales', description: 'Notificaciones de desafíos de entrenamiento semanales' },
  { key: 'newArticles', icon: <ChartBarIcon size={18} color={colors.text} />, label: 'Nuevos artículos', description: 'Nuevos artículos de blog y marketing' },
  { key: 'communityUpdates', icon: <ChatIcon size={18} color={colors.text} />, label: 'Actualizaciones de la comunidad', description: 'Actualizaciones del foro y discusiones de la comunidad' },
  { key: 'progressReports', icon: <BellIcon size={18} color={colors.text} />, label: 'Informes de progreso', description: 'Resúmenes de progreso y notificaciones de logros' },
];

type Preferences = Record<string, boolean>;

const DEFAULT_PREFERENCES: Preferences = {
  workoutReminders: true,
  weeklyChallenges: true,
  newArticles: false,
  communityUpdates: true,
  progressReports: false,
};

async function fetchPreferences(): Promise<Preferences> {
  const { data } = await apiClient.get('/athlete/notification-preferences');
  const payload = (data as any)?.data ?? data;
  return (payload as Preferences) ?? DEFAULT_PREFERENCES;
}

async function savePreferences(prefs: Preferences): Promise<void> {
  await apiClient.put('/athlete/notification-preferences', prefs);
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const { data: serverPrefs, isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: fetchPreferences,
    staleTime: 300_000,
  });

  const [toggles, setToggles] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (serverPrefs) {
      setToggles(serverPrefs);
    }
  }, [serverPrefs]);

  const saveMutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
    onError: () => {
      // Revert to server state on error
      if (serverPrefs) {
        setToggles(serverPrefs);
      }
    },
  });

  const handleToggle = (key: string) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    saveMutation.mutate(next);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Configuración de notificaciones</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentWrap}>
        {isLoading ? (
          <Skeleton.List rows={5} height={72} />
        ) : (
          NOTIFICATION_TYPES.map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={styles.iconCircle}>{item.icon}</View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDescription}>{item.description}</Text>
              </View>
              <Switch
                value={toggles[item.key]}
                onValueChange={() => handleToggle(item.key)}
                trackColor={{ true: colors.primary, false: colors.surfaceRaised }}
                thumbColor={colors.text}
                ios_backgroundColor={colors.surfaceRaised}
              />
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.primary,
  },
  headerSpacer: { width: 32 },
  contentWrap: { padding: spacing.md, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  rowDescription: { ...typography.caption, color: colors.textSecondary, lineHeight: 16 },
});
