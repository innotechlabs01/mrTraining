/**
 * ExerciseVideoPlayer — Displays demo videos for exercises.
 * Tracks view metrics (duration, pauses, replays, completion %).
 *
 * Uses expo-av for playback and sends metrics on unmount.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../../theme/tokens'

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

  const handleSeek = useCallback(async (milliseconds: number) => {
    if (!videoRef.current) return
    await videoRef.current.setPositionAsync(milliseconds)
  }, [])

  const handleReplay = useCallback(async () => {
    if (!videoRef.current) return
    metricsRef.current.replayCount++
    isReplayRef.current = false
    await videoRef.current.setPositionAsync(0)
    await videoRef.current.playAsync()
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

        {!isLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {showControls && isLoaded && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={48}
                color="white"
              />
            </TouchableOpacity>

            {onRecordPress && (
              <TouchableOpacity onPress={onRecordPress} style={styles.recordButton}>
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.recordText}>Grabar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      {isLoaded && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
            ]}
          />
        </View>
      )}

      {isLoaded && (
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      )}

      {title && (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleReplay} style={styles.replayButton}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  recordText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  time: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  replayButton: {
    padding: spacing.sm,
  },
})
