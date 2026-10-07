/**
 * Overlays layered above the video surface: the loading spinner and the
 * tap-to-toggle controls (play/pause + optional record FAB).
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/tokens'

export function VideoLoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

interface VideoControlsOverlayProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onRecordPress: (() => void) | undefined
}

export function VideoControlsOverlay({
  isPlaying,
  onTogglePlay,
  onRecordPress,
}: VideoControlsOverlayProps) {
  return (
    <View style={styles.controlsOverlay}>
      <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
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
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}E6`,
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
})
