/**
 * Footer blocks of the exercise video player: the progress bar with its
 * elapsed/remaining time row, and the title row with the replay shortcut.
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../../theme/tokens'

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface VideoProgressBarProps {
  position: number
  duration: number
}

export function VideoProgressBar({ position, duration }: VideoProgressBarProps) {
  return (
    <>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
          ]}
        />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(position)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>
    </>
  )
}

interface VideoTitleBarProps {
  title: string
  onReplay: () => void
}

export function VideoTitleBar({ title, onReplay }: VideoTitleBarProps) {
  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity onPress={onReplay} style={styles.replayButton}>
        <Ionicons name="refresh" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
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
