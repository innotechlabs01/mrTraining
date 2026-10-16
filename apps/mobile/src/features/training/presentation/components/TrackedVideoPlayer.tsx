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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { isPlayableVideoUrl } from '../../../../shared/components/video/isPlayableVideoUrl';
import { recordView } from '../../../videoViews/videoViewService';
import { PlayIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.trackedVideoPlayer;

type Props = {
  videoUrl: string;
  exerciseId: string;
  athleteId: string;
};

const PROGRESS_MARKS = [0.25, 0.5, 0.75];

export function TrackedVideoPlayer({ videoUrl, exerciseId, athleteId }: Props) {
  const player = useVideoPlayer({ uri: videoUrl }, (p) => {
    p.loop = false;
    // Emit timeUpdate at the same cadence expo-av used for status updates (~500ms).
    p.timeUpdateEventInterval = 0.5;
  });
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const viewIdRef = useRef<string | null>(null);
  const reportedMarks = useRef(new Set<number>());
  const sourceRef = useRef(videoUrl);

  // expo-av reloaded whenever `source` changed — replicate with replaceAsync.
  useEffect(() => {
    if (sourceRef.current !== videoUrl) {
      sourceRef.current = videoUrl;
      void player.replaceAsync({ uri: videoUrl });
    }
  }, [videoUrl, player]);

  // Fire-and-forget POST — never blocks the player.
  const track = useCallback((action: string, data: Record<string, unknown> = {}) => {
    recordView({ exerciseID: exerciseId, athleteID: athleteId, action, ...data }).catch(() => {});
  }, [exerciseId, athleteId]);

  // Replaces onPlaybackStatusUpdate: progress marks + >=90% completion.
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const duration = player.duration || 0;
    const pct = duration > 0 ? currentTime / duration : 0;

    // Report progress at 25/50/75% marks.
    for (const mark of PROGRESS_MARKS) {
      if (pct >= mark && !reportedMarks.current.has(mark)) {
        reportedMarks.current.add(mark);
        if (viewIdRef.current) {
          track('progress', { viewId: viewIdRef.current, positionSec: currentTime, totalDurationSec: duration });
        }
      }
    }

    // On completion (>= 90% or natural end).
    if (pct >= 0.9 && viewIdRef.current) {
      track('complete', { viewId: viewIdRef.current, positionSec: currentTime, totalDurationSec: duration });
    }
  });

  // Natural end of playback (old `didJustFinish`).
  useEventListener(player, 'playToEnd', () => {
    if (viewIdRef.current) {
      track('complete', { viewId: viewIdRef.current, positionSec: player.currentTime, totalDurationSec: player.duration });
    }
  });

  // Load / error states (old onLoad / onError).
  useEventListener(player, 'statusChange', ({ status: playerStatus }) => {
    if (playerStatus === 'error') {
      setStatus('error');
    } else if (playerStatus === 'readyToPlay') {
      setReady(true);
      setStatus((prev) => (prev === 'loading' ? 'idle' : prev));
    }
  });

  const handlePlay = useCallback(async () => {
    setStatus('loading');
    try {
      // Start view tracking and playback in parallel — analytics never blocks video.
      player.play();
      const res = await recordView({ exerciseID: exerciseId, athleteID: athleteId, action: 'start' })
        .catch(() => null);

      viewIdRef.current = res?.viewId ?? null;
      reportedMarks.current.clear();
      setPlaying(true);
      setStatus('playing');
    } catch {
      // Fallback: play without tracking.
      player.play();
      setPlaying(true);
      setStatus('playing');
    }
  }, [exerciseId, athleteId, player]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setPlaying(false);
  }, []);

  // Defense in depth: callers already guard, but never mount VideoView for an
  // unplayable URL (and never reserve the black 16/9 block).
  if (!isPlayableVideoUrl(videoUrl)) return null;

  return (
    <View style={[styles.container, ready ? styles.containerReady : styles.containerPending]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
      />
      {status === 'error' && (
        <View style={styles.playOverlay}>
          <Text style={styles.errorText}>{t.loadError}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>{texts.common.retry}</Text>
          </Pressable>
        </View>
      )}
      {status === 'loading' && (
        <View style={styles.playOverlay}>
          <Text style={styles.playLabel}>{texts.common.loading}</Text>
        </View>
      )}
      {!playing && status !== 'loading' && status !== 'error' && (
        <Pressable style={styles.playOverlay} onPress={handlePlay}>
          <View style={styles.playButton}>
            <PlayIcon size={28} color="#fff" />
          </View>
          <Text style={styles.playLabel}>{texts.screens.workoutExecution.viewDemo}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', aspectRatio: 16 / 9 },
  containerReady: { backgroundColor: '#000' },
  containerPending: { backgroundColor: colors.surfaceRaised },
  video: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFill,
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
  errorText: { ...typography.body, color: '#fff', marginBottom: spacing.sm, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryText: { ...typography.body, color: '#fff', fontWeight: '600' },
});
