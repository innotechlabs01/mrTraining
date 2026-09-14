import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import type { Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import { tokens } from '../../../../shared/theme/tokens';
import { useAiWorkout } from '../hooks/useAiWorkout';
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

export function AiWorkoutScreen({ route }: { route: { params: { exerciseId: string; target: number } } }): React.JSX.Element {
  const { exerciseId, target } = route.params;
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [counting, setCounting] = useState(false);
  const runtimeRef = useRef(new MediaPipePoseRuntime());
  const ai = useAiWorkout(exerciseId, target, runtimeRef.current);

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