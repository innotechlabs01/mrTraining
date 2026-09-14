/**
 * TrackedVideoPlayer — plays exercise demo videos and reports view progress to the backend.
 *
 * Tracking events:
 *   - start:    when playback begins (creates a view session)
 *   - progress: at 25%, 50%, 75% of duration
 *   - complete: when playback reaches >= 90% or the user finishes
 *
 * All network calls are fire-and-forget; a failed tracking event never blocks playback.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { recordView } from '../../../videoViews/videoViewService';
import { PlayIcon } from '../../../../shared/components/icons';

type Props = {
  videoUrl: string;
  exerciseId: string;
  athleteId: string;
};

const PROGRESS_MARKS = [0.25, 0.5, 0.75];

export function TrackedVideoPlayer({ videoUrl, exerciseId, athleteId }: Props) {
  const videoRef = useRef<Video>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const viewIdRef = useRef<string | null>(null);
  const reportedMarks = useRef(new Set<number>());

  // Fire-and-forget POST — never blocks the player.
  const track = useCallback((action: string, data: Record<string, unknown> = {}) => {
    recordView({ exerciseID: exerciseId, athleteID: athleteId, action, ...data }).catch(() => {});
  }, [exerciseId, athleteId]);

  const handlePlaybackStatusUpdate = useCallback((s: any) => {
    if (!s.isLoaded) return;

    const duration = (s.durationMillis ?? 0) / 1000;
    const position = (s.positionMillis ?? 0) / 1000;
    const pct = duration > 0 ? position / duration : 0;

    // Report progress at 25/50/75% marks.
    for (const mark of PROGRESS_MARKS) {
      if (pct >= mark && !reportedMarks.current.has(mark)) {
        reportedMarks.current.add(mark);
        if (viewIdRef.current) {
          track('progress', { viewId: viewIdRef.current, positionSec: position, totalDurationSec: duration });
        }
      }
    }

    // On completion (>= 90% or natural end).
    if (s.didJustFinish || pct >= 0.9) {
      if (viewIdRef.current) {
        track('complete', { viewId: viewIdRef.current, positionSec: position, totalDurationSec: duration });
      }
    }
  }, [track]);

  const handlePlay = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      // Start view tracking session.
      const res = await recordView({ exerciseID: exerciseId, athleteID: athleteId, action: 'start' }).catch(() => null);
      viewIdRef.current = res?.viewId ?? null;
      reportedMarks.current.clear();
      await videoRef.current.playAsync();
      setPlaying(true);
    } catch {
      // Fallback: play without tracking.
      await videoRef.current?.playAsync().catch(() => {});
    }
  }, [exerciseId, athleteId]);

  const handlePause = useCallback(async () => {
    if (!videoRef.current) return;
    await videoRef.current.pauseAsync();
    setPlaying(false);
    // Report final position on pause.
    if (viewIdRef.current) {
      const s = await videoRef.current.getStatusAsync().catch(() => null);
      if (s?.isLoaded) {
        track('progress', {
          viewId: viewIdRef.current,
          positionSec: (s.positionMillis ?? 0) / 1000,
          totalDurationSec: (s.durationMillis ?? 0) / 1000,
        });
      }
    }
  }, [track]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        shouldPlay={false}
        useNativeControls
      />
      {!playing && (
        <Pressable style={styles.playOverlay} onPress={handlePlay}>
          <View style={styles.playButton}>
            <PlayIcon size={28} color="#fff" />
          </View>
          <Text style={styles.playLabel}>Ver demo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16 / 9 },
  video: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  playLabel: { ...typography.body, color: '#fff', marginTop: spacing.sm },
});
