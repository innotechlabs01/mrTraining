import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/tokens'

type Props = {
  isRecording: boolean
  isUploading: boolean
  onCancel: () => void
  onRecord: () => void
  onFlip: () => void
}

export function CameraControls({ isRecording, isUploading, onCancel, onRecord, onFlip }: Props) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity onPress={onCancel} style={styles.controlButton}>
        <Ionicons name="close" size={32} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRecord}
        style={[
          styles.recordButton,
          isRecording && styles.recordButtonActive,
        ]}
        disabled={isUploading}
      >
        <View style={[
          styles.recordButtonInner,
          isRecording && styles.recordButtonInnerActive,
        ]} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onFlip}
        style={styles.controlButton}
      >
        <Ionicons name="camera-reverse" size={32} color="white" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  recordButtonActive: {
    borderColor: colors.error,
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error,
  },
  recordButtonInnerActive: {
    borderRadius: 8,
    width: 32,
    height: 32,
  },
})
