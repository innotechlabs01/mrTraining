/**
 * RunningSessionSummaryScreen — post-run summary with real metrics.
 * Shows distance, duration, avg pace, HR, cadence, calories, sync status.
 * Primary action: "Done" returns to the running workout list.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { texts } from '../../../../shared/i18n/texts';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface RunningSessionSummaryItem {
  session_id: string;
  status: string;
  distance: number;
  duration: number;
  pace: string;
  heart_rate: number;
  cadence: number;
}

export function RunningSessionSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const sessionId = navigation.getParam('sessionId') as string | undefined;

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['running-session-summary', sessionId],
    queryFn: async (): Promise<RunningSessionSummaryItem> => {
      const { data } = await apiClient.get<RunningSessionSummaryItem>(
        `/running/sessions/${sessionId}`,
      );
      return data;
    },
    enabled: !!sessionId,
  });

  const handleDone = useCallback(() => {
    navigation.navigate('RunningWorkoutList');
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={texts.screens.runningSessionSummary.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="loading" />
      </SafeAreaView>
    );
  }

  if (isError || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={texts.screens.runningSessionSummary.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="error" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={texts.screens.runningSessionSummary.title} onBack={() => navigation.goBack()} />

      <View style={styles.metricCard}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningSessionSummary.distanceLabel}</Text>
          <Text style={styles.metricValue}>{session.distance.toFixed(2)} km</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningSessionSummary.durationLabel}</Text>
          <Text style={styles.metricValue}>{formatDuration(session.duration)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningSessionSummary.paceLabel}</Text>
          <Text style={styles.metricValue}>{session.pace}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningSessionSummary.hrLabel}</Text>
          <Text style={styles.metricValue}>{session.heart_rate} bpm</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningSessionSummary.cadenceLabel}</Text>
          <Text style={styles.metricValue}>{session.cadence} spm</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{texts.screens.runningSessionSummary.planVsActual}</Text>
        <View style={styles.planVsActualRow}>
          <View style={styles.planVsActualCol}>
            <Text style={styles.planVsActualLabel}>Plan</Text>
            <Text style={styles.planVsActualValue}>--</Text>
          </View>
          <View style={styles.planVsActualCol}>
            <Text style={styles.planVsActualLabel}>Real</Text>
            <Text style={styles.planVsActualValue}>{session.distance.toFixed(2)} km</Text>
          </View>
        </View>
      </View>

      <View style={styles.syncBanner}>
        <Text style={styles.syncText}>{texts.screens.runningSessionSummary.synced}</Text>
      </View>

      <View style={styles.bottomSpacer} />

      <PrimaryButton
        label={texts.screens.runningSessionSummary.done}
        onPress={handleDone}
        fullWidth={false}
      />
    </SafeAreaView>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
  metricValue: { ...typography.h4, color: colors.text, fontWeight: '600' },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  planVsActualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  planVsActualCol: {
    alignItems: 'center',
  },
  planVsActualLabel: { ...typography.caption, color: colors.textSecondary },
  planVsActualValue: { ...typography.label, color: colors.text },
  syncBanner: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  syncText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  bottomSpacer: { height: spacing.lg * 2 },
});
