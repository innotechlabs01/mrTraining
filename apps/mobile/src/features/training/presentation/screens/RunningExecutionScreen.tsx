/**
 * RunningExecutionScreen — ejecución guiada de sesión de running.
 * Muestra segmento actual, objetivos, métricas en tiempo real con GPS y
 * controles de pausa/reanudar/finalizar. Incluye indicaciones de voz.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
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
import { useRunningAudio } from '../application/useRunningAudio';
import { useGpsTracking } from '../application/useGpsTracking';
import { useRunningOffline } from '../application/useRunningOffline';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RunningExecutionScreen({ sessionId, workoutId }: { sessionId: string; workoutId: string }) {
  const navigation = useNavigation<Nav>();
  const { speak, isSpeaking } = useRunningAudio();
  const {
    isTracking,
    startTracking,
    stopTracking,
    error: gpsError,
  } = useGpsTracking({
    workoutId,
    exerciseId: sessionId,
    enabled: true,
  });
  const {
    pendingSessions,
    syncPendingSessions,
    syncPendingPoints,
    isSyncing,
  } = useRunningOffline();

  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  const handleFinish = async () => {
    if (timer) clearInterval(timer);
    if (isTracking) stopTracking();
    // Sincronizar puntos pendientes antes de finalizar
    await syncPendingPoints(sessionId);
    navigation.navigate('RunningSessionSummary', { sessionId });
  };

  const announceSegment = useCallback((segmentName: string) => {
    speak(`Segmento ${segmentName}`);
  }, [speak]);

  useEffect(() => {
    if (isTracking && !isPaused) {
      setTimer(setInterval(() => setTimeElapsed((t) => t + 1), 1000));
    } else if (timer) {
      clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTracking, isPaused, timer]);

  if (isLoading || templateLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="loading" />
      </SafeAreaView>
    );
  }

  if (isError || !assignment || !template) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="error" title={tw.errorTitle} message={tw.errorMessage} actionLabel={tw.retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />

      <View style={styles.segmentCard}>
        <Text style={styles.segmentLabel}>{texts.screens.runningExecution.segmentCurrent}</Text>
        <Text style={styles.segmentName}>{template.name}</Text>
        <Text style={styles.segmentInstruction}>
          {template.description || tw.segmentInstructionPlaceholder}
        </Text>
      </View>

      <View style={styles.metricsCard}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningExecution.timeElapsed}</Text>
          <Text style={styles.metricValue}>{formatTime(timeElapsed)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningExecution.distanceLabel}</Text>
          <Text style={styles.metricValue}>0.00 km</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningExecution.paceLabel}</Text>
          <Text style={styles.metricValue}>--:-- min/km</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningExecution.hrLabel}</Text>
          <Text style={styles.metricValue}>-- bpm</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{texts.screens.runningExecution.cadenceLabel}</Text>
          <Text style={styles.metricValue}>-- spm</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <PrimaryButton
          label={isPaused ? texts.screens.runningExecution.resumeButton : texts.screens.runningExecution.pauseButton}
          onPress={handlePauseResume}
          variant="outline"
          fullWidth={false}
        />
        <PrimaryButton
          label={texts.screens.runningExecution.finishButton}
          onPress={handleFinish}
          variant="ghost"
          fullWidth={false}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  segmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentLabel: { ...typography.caption, color: colors.textSecondary },
  segmentName: { ...typography.h3, color: colors.text },
  segmentInstruction: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  bottomSpacer: { height: spacing.lg * 2 },
});