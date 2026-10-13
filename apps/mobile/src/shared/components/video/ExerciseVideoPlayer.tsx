/**
 * ExerciseVideoPlayer — Displays demo videos for exercises.
 * Tracks view metrics (duration, pauses, replays, completion %).
 *
 * Uses expo-video for playback and sends metrics on unmount.
 * Overlays and footer blocks live in ExerciseVideoOverlays / ExerciseVideoFooter.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useEvent, useEventListener } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { radius } from '../../theme/tokens'
import { isPlayableVideoUrl } from './isPlayableVideoUrl'
import { VideoLoadingOverlay, VideoControlsOverlay } from './ExerciseVideoOverlays'
import { VideoProgressBar, VideoTitleBar } from './ExerciseVideoFooter'

interface VideoMetrics {
  durationSec: number
  maxPositionSec: number
  completedPct: number
  pauseCount: number
  replayCount: number
}

interface ExerciseVideoPlayerProps {
  videoUrl: string
  videoId: string
  videoType: 'demo' | 'form' | 'feedback'
  title?: string
  onRecordPress?: () => void
}

export function ExerciseVideoPlayer({
  videoUrl,
  videoId,
  videoType,
  title,
  onRecordPress,
}: ExerciseVideoPlayerProps) {
  const player = useVideoPlayer({ uri: videoUrl }, (p) => {
    p.loop = false
    // Emit timeUpdate at the same cadence expo-av used for status updates (~500ms).
    p.timeUpdateEventInterval = 0.5
  })
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const [isLoaded, setIsLoaded] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const sourceRef = useRef(videoUrl)

  // expo-av reloaded whenever `source` changed — replicate with replaceAsync.
  useEffect(() => {
    if (sourceRef.current !== videoUrl) {
      sourceRef.current = videoUrl
      setIsLoaded(false)
      setPosition(0)
      setDuration(0)
      void player.replaceAsync({ uri: videoUrl })
    }
  }, [videoUrl, player])

  // Metrics tracking
  const metricsRef = useRef<VideoMetrics>({
    durationSec: 0,
    maxPositionSec: 0,
    completedPct: 0,
    pauseCount: 0,
    replayCount: 0,
  })
  const isReplayRef = useRef(false)

  // Send metrics to API
  const sendMetrics = useCallback(async () => {
    const metrics = metricsRef.current
    if (metrics.durationSec === 0) return

    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
      await fetch(`${API_BASE}/api/athlete/video-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          videoType,
          ...metrics,
        }),
      })
    } catch (err) {
      console.warn('Failed to send video metrics:', err)
    }
  }, [videoId, videoType])

  // Send metrics on unmount
  useEffect(() => {
    return () => {
      sendMetrics()
    }
  }, [sendMetrics])

  // Duration is reported in seconds (old onLoad gave AVPlaybackStatus millis).
  useEventListener(player, 'sourceLoad', ({ duration: loadedDuration }) => {
    setDuration(loadedDuration)
    metricsRef.current.durationSec = loadedDuration
    setIsLoaded(true)
  })

  // Replaces onPlaybackStatusUpdate for position / completion-% tracking.
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setPosition(currentTime)
    metricsRef.current.maxPositionSec = Math.max(metricsRef.current.maxPositionSec, currentTime)

    if (player.duration > 0) {
      metricsRef.current.completedPct = Math.round(
        (currentTime / player.duration) * 100
      )
    }
  })

  // Natural end of playback (old `didJustFinish`).
  useEventListener(player, 'playToEnd', () => {
    metricsRef.current.completedPct = 100
    void sendMetrics()
  })

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause()
      metricsRef.current.pauseCount++
    } else {
      // Detect replay
      if (isReplayRef.current) {
        metricsRef.current.replayCount++
        isReplayRef.current = false
      }
      player.play()
    }
  }, [isPlaying, player])

  const handleReplay = useCallback(() => {
    metricsRef.current.replayCount++
    isReplayRef.current = false
    player.currentTime = 0
    player.play()
  }, [player])

  // Defense in depth: never mount VideoView for an unplayable URL.
  if (!isPlayableVideoUrl(videoUrl)) return null

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
        style={styles.videoWrapper}
      >
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />

        {!isLoaded && <VideoLoadingOverlay />}

        {showControls && isLoaded && (
          <VideoControlsOverlay
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onRecordPress={onRecordPress}
          />
        )}
      </TouchableOpacity>

      {isLoaded && <VideoProgressBar position={position} duration={duration} />}

      {title && <VideoTitleBar title={title} onReplay={handleReplay} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  videoWrapper: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
})
