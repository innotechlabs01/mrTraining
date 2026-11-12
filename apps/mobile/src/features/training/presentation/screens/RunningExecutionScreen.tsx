/** Foreground execution of an assigned running workout. */
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, usePreventRemove, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { AlertBanner } from '../../../../shared/components/ui/AlertBanner';
import { PendingSyncBadge } from '../components/execution/PendingSyncBadge';
import { texts } from '../../../../shared/i18n/texts';
import { useGuidedRunningSession } from '../../application/useGuidedRunningSession';
import {
  useRunningWorkoutAssignment,
  useRunningWorkoutTemplate,
  runningWorkoutKeys,
  type CompleteRunningSessionRequest,
} from '../../application/useRunningWorkouts';
import { useRunningSync } from '../../application/useRunningSync';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RunningExecution'>;
const tw = texts.screens.runningExecution;

export function RunningExecutionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const sessionId = route.params?.sessionId ?? '';
  const assignmentId = route.params?.workoutId ?? '';
  const assignment = useRunningWorkoutAssignment(assignmentId);
  const template = useRunningWorkoutTemplate(assignment.data?.template_id ?? '');
  const ready = !!sessionId && !!template.data;
  const run = useGuidedRunningSession(sessionId, ready);
  const sync = useRunningSync();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  usePreventRemove(ready && !saved, ({ data }) => {
    if (run.isSaving || sync.isSyncing) return;
    Alert.alert(tw.leaveTitle, tw.leaveMessage, [
      { text: tw.stayButton, style: 'cancel' },
      { text: tw.leaveButton, style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (saved) navigation.replace('RunningSessionSummary', { sessionId });
  }, [navigation, saved, sessionId]);

  const handleFinish = async () => {
    if (!sessionId) return;
    const req: CompleteRunningSessionRequest = {
      distance: run.distanceKm,
      duration: run.durationSeconds,
      pace: run.pace,
      // Sin wearable conectado: no se inventan mediciones fisiológicas.
      calories: 0, elevation: 0, heart_rate: 0, cadence: 0,
      // Los puntos GPS viajan por lotes durante la ejecución; el campo es opcional.
      gps_route: '',
    };
    if (!await sync.completeSession(sessionId, req)) return;
    void queryClient.invalidateQueries({ queryKey: runningWorkoutKeys.assignments });
    setSaved(true);
  };

  if (assignment.isLoading || template.isLoading) {
    return <SafeAreaView style={styles.container}><EmptyState variant="loading" /></SafeAreaView>;
  }
  if (!ready || assignment.isError || template.isError) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="error" onRetry={() => {
          void assignment.refetch();
          void template.refetch();
        }} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
      {sync.status === 'error' && (
        <AlertBanner
          tone="error"
          title={tw.syncFailed}
          message={tw.syncError}
          actionLabel={tw.retry}
          onAction={() => void sync.retrySync()}
        />
      )}
      {sync.status === 'started' && (
        <AlertBanner tone="info" title={tw.sessionStarted} message={tw.sessionStartedMessage} />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{template.data?.name}</Text>
          <Text style={styles.body}>{template.data?.description || assignment.data?.athlete_instructions}</Text>
          {template.data?.segments.map((segment, index) => (
            <Text key={segment.id} style={styles.body}>{index + 1}. {segment.instruction}</Text>
          ))}
        </View>
        {run.gpsError && <AlertBanner tone="error" title={tw.noGpsSignal} message={run.gpsError} actionLabel={tw.retry} onAction={() => void run.retryGps()} />}
        {sync.pendingCount > 0 && (
          <PendingSyncBadge count={sync.pendingCount} accessibilityLabel={tw.pendingSync} />
        )}
        <View style={styles.card}>
          <Metric label={tw.timeElapsed} value={`${Math.floor(run.durationSeconds / 60)}:${String(run.durationSeconds % 60).padStart(2, '0')}`} />
          <Metric label={tw.distanceLabel} value={`${run.distanceKm.toFixed(2)} km`} />
          <Metric label={tw.paceLabel} value={`${run.pace} min/km`} />
        </View>
        <PrimaryButton
          label={run.isPaused ? tw.resumeButton : tw.pauseButton}
          onPress={run.togglePause}
          variant="outline"
          disabled={sync.isSyncing || run.isSaving || sync.status === 'completed'}
        />
        <PrimaryButton label={tw.finishButton} onPress={() => void handleFinish()} loading={sync.isSyncing || run.isSaving} disabled={sync.status === 'completed'} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metricRow}><Text style={styles.body}>{label}</Text><Text style={styles.title}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.h4, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
});
