/**
 * ExerciseVideoPlayer — Displays demo videos for exercises.
 * Tracks view metrics (duration, pauses, replays, completion %).
 *
 * Uses expo-video for playback and sends metrics on unmount.
 * Overlays and footer blocks live in ExerciseVideoOverlays / ExerciseVideoFooter.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useEvent, useEventListener } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { radius } from '../../theme/tokens'
import { hasVideoSource, isPlayableVideoUrl } from './isPlayableVideoUrl'
import { useSignedMediaUrl } from '../../media/useSignedMediaUrl'
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

export function ExerciseVideoPlayer(props: ExerciseVideoPlayerProps) {
  if (!hasVideoSource(props.videoUrl)) return null
  return <ExerciseVideoPlayerInner {...props} />
}

function ExerciseVideoPlayerInner({
  videoUrl,
  videoId,
  videoType,
  title,
  onRecordPress,
}: ExerciseVideoPlayerProps) {
  const { url: signedUrl, isLoading: isSigning } = useSignedMediaUrl(videoUrl)
  const playableUrl = isPlayableVideoUrl(signedUrl) ? signedUrl : undefined

  const player = useVideoPlayer(playableUrl ? { uri: playableUrl } : null, (p) => {
    p.loop = false
    // Emit timeUpdate at the same cadence expo-av used for status updates (~500ms).
    p.timeUpdateEventInterval = 0.5
  })
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const [isLoaded, setIsLoaded] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const sourceRef = useRef(playableUrl)

  // expo-av reloaded whenever `source` changed — replicate with replaceAsync.
  useEffect(() => {
    if (sourceRef.current !== playableUrl) {
      sourceRef.current = playableUrl
      setIsLoaded(false)
      setPosition(0)
      setDuration(0)
      if (playableUrl) {
        void player.replaceAsync({ uri: playableUrl })
      }
    }
  }, [playableUrl, player])

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

    // Telemetry is optional. The web video-metrics endpoint was deprecated during the API-first migration;
    // keep collection local until a Go metrics endpoint is available.
    return
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

  if (!hasVideoSource(videoUrl)) return null

  if (isSigning) {
    return (
      <View style={styles.container}>
        <View style={styles.videoWrapper}>
          <VideoLoadingOverlay />
        </View>
      </View>
    )
  }

  // Defense in depth: never mount VideoView for an unplayable URL.
  if (!playableUrl) return null

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
