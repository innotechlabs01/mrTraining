import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import type { Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import { tokens } from '../../../../shared/theme/tokens';
import { texts } from '../../../../shared/i18n/texts';
import { useAiWorkout } from '../hooks/useAiWorkout';
import type { RepQuality } from '../../domain/RepTypes';
import { FramingOverlay } from '../components/FramingOverlay';
import { DebugOverlay } from '../components/DebugOverlay';
import { SessionSummaryOverlay } from '../components/SessionSummaryOverlay';
import { MediaPipePoseRuntime } from '../../infrastructure/pose/MediaPipePoseRuntime';

const { colors, spacing, typography, radius } = tokens;

function Countdown({ active }: { active: boolean }): React.JSX.Element | null {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (!active) return () => undefined;
    setN(3);
    const id = setInterval(() => setN((v) => (v > 1 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  return (
    <View pointerEvents="none" style={styles.countdownWrap} accessibilityRole="summary">
      <Text style={styles.countdown}>{n > 0 ? n : 'GO'}</Text>
    </View>
  );
}

type AiWorkoutParams = {
  exerciseId: string;
  target: number;
  /** Workout exercise row id for handing results back to execution. */
  exerciseDbId?: string;
};

function verdictForQuality(quality: RepQuality): { label: string; color: string } | null {
  const t = texts.screens.aiWorkout;
  if (quality === 'GOOD') return { label: t.verdictGood, color: colors.success };
  if (quality === 'REGULAR') return { label: t.verdictRegular, color: colors.warning };
  if (quality === 'BAD') return { label: t.verdictBad, color: colors.error };
  return null;
}

export function AiWorkoutScreen({ route }: { route: { params: AiWorkoutParams } }): React.JSX.Element {
  const { exerciseId, target, exerciseDbId } = route.params;
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [counting, setCounting] = useState(false);
  const runtimeRef = useRef(new MediaPipePoseRuntime());
  const aiOptions = useMemo(() => (exerciseDbId ? { executionExerciseId: exerciseDbId } : {}), [exerciseDbId]);
  const ai = useAiWorkout(exerciseId, target, runtimeRef.current, aiOptions);
  const verdict = ai.quality ? verdictForQuality(ai.quality) : null;

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const handleFrameJS = useCallback((frame: Frame) => {
    ai.onFrame(frame, Date.now());
    frame.dispose();
  }, [ai]);
  const notifyJS = useMemo(() => runOnJS(handleFrameJS), [handleFrameJS]);

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame(frame: Frame) {
      'worklet';
      notifyJS(frame);
    },
  });

  const onPress = useCallback(() => {
    setCounting((v) => !v);
    if (!counting) ai.startCountdown();
    else ai.stop();
  }, [ai, counting]);

  if (!device) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.error}>No camera device available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
      />
      <FramingOverlay status={ai.status} />
      <Countdown active={counting} />
      <DebugOverlay visible={__DEV__ && ai.debug.aiFps > 0} info={ai.debug} />
      <SessionSummaryOverlay summary={ai.summary} visible={ai.sessionCompleted} />
      <View style={styles.topBar}>
        <Text style={styles.repCounter}>
          {ai.repCount} / {ai.target}
        </Text>
        {ai.hint ? <Text style={styles.hint}>{ai.hint}</Text> : null}
        {verdict ? (
          <View
            style={[styles.verdictChip, { borderColor: verdict.color }]}
            accessibilityRole="text"
            accessibilityLabel={`${texts.screens.aiWorkout.formScoreLabel}: ${verdict.label}`}
          >
            <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={counting ? 'Stop counting' : 'Start counting'}
        onPress={onPress}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>{counting ? 'Detener' : 'Empezar'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  camera: { ...StyleSheet.absoluteFillObject },
  error: { color: colors.text, ...typography.body, padding: spacing.lg },
  countdownWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdown: { color: colors.primary, ...(typography.metricXL as unknown as TextStyle) },
  topBar: { position: 'absolute', top: spacing.lg, left: 0, right: 0, alignItems: 'center' },
  repCounter: { color: colors.text, ...(typography.metricLG as unknown as TextStyle) },
  hint: { color: colors.onSurfaceVariant, ...typography.bodySmall, marginTop: spacing.xs },
  verdictChip: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: radius.full ?? radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  verdictLabel: { ...typography.label },
  cta: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full ?? radius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  ctaText: { color: colors.onPrimary, ...typography.label },
});