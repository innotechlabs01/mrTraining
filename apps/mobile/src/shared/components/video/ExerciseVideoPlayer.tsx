/**
 * ExerciseVideoPlayer — Displays demo videos for exercises.
 * Tracks view metrics (duration, pauses, replays, completion %).
 *
 * Uses expo-av for playback and sends metrics on unmount.
 * Overlays and footer blocks live in ExerciseVideoOverlays / ExerciseVideoFooter.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { radius } from '../../theme/tokens'
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
  const videoRef = useRef<Video>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)

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

  const handleLoad = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.durationMillis) {
      const dur = status.durationMillis / 1000
      setDuration(dur)
      metricsRef.current.durationSec = dur
      setIsLoaded(true)
    }
  }, [])

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return

    if (status.positionMillis !== undefined) {
      const pos = status.positionMillis / 1000
      setPosition(pos)
      metricsRef.current.maxPositionSec = Math.max(metricsRef.current.maxPositionSec, pos)
    }

    if (status.durationMillis && status.positionMillis !== undefined) {
      metricsRef.current.completedPct = Math.round(
        (status.positionMillis / status.durationMillis) * 100
      )
    }

    if (status.didJustFinish) {
      setIsPlaying(false)
      metricsRef.current.completedPct = 100
      sendMetrics()
    }

    if (status.isPlaying !== undefined) {
      setIsPlaying(status.isPlaying)
    }
  }, [sendMetrics])

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return

    if (isPlaying) {
      await videoRef.current.pauseAsync()
      metricsRef.current.pauseCount++
    } else {
      // Detect replay
      if (isReplayRef.current) {
        metricsRef.current.replayCount++
        isReplayRef.current = false
      }
      await videoRef.current.playAsync()
    }
  }, [isPlaying])

  const handleReplay = useCallback(async () => {
    if (!videoRef.current) return
    metricsRef.current.replayCount++
    isReplayRef.current = false
    await videoRef.current.setPositionAsync(0)
    await videoRef.current.playAsync()
  }, [])

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
        style={styles.videoWrapper}
      >
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          onLoad={handleLoad}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
          shouldPlay={false}
          isLooping={false}
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
