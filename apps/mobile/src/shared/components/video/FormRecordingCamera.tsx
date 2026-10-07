/**
 * FormRecordingCamera — Records athlete performing an exercise.
 * Uses react-native-vision-camera v5 with useVideoOutput + Recorder.
 *
 * Flow:
 * 1. Camera opens with exercise name overlay
 * 2. Athlete records themselves
 * 3. Video uploads to Vercel via API
 * 4. Recording saved to DB
 */
import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, CameraRef } from 'react-native-vision-camera'
import { useVideoOutput } from 'react-native-vision-camera'
import { colors } from '../../theme/tokens'
import { texts } from '../../i18n/texts'
import { useVideoUpload } from './useVideoUpload'
import { useFormRecorder } from './useFormRecorder'
import { CameraPermissionView } from './CameraPermissionView'
import { CameraControls } from './CameraControls'

const tc = texts.formCamera

interface FormRecordingCameraProps {
  exerciseId: string
  exerciseName: string
  workoutId?: string
  onRecordingComplete: (recordingUrl: string) => void
  onCancel: () => void
}

export function FormRecordingCamera({
  exerciseId,
  exerciseName,
  workoutId,
  onRecordingComplete,
  onCancel,
}: FormRecordingCameraProps) {
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const cameraRef = useRef<CameraRef>(null)

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission()
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission()

  const device = useCameraDevice(isFrontCamera ? 'front' : 'back')

  const videoOutput = useVideoOutput({
    enableAudio: true,
  })

  const { isUploading, uploadVideo } = useVideoUpload({
    exerciseId,
    workoutId,
    onRecordingComplete,
  })

  const { isRecording, handleRecord } = useFormRecorder({
    videoOutput,
    onRecorded: uploadVideo,
  })

  // Request permissions
  if (!hasCameraPermission || !hasMicPermission) {
    return (
      <CameraPermissionView
        variant="permission"
        onRequestPermissions={async () => {
          await requestCameraPermission()
          await requestMicPermission()
        }}
        onCancel={onCancel}
      />
    )
  }

  if (!device) {
    return (
      <CameraPermissionView
        variant="noDevice"
        onRequestPermissions={() => {}}
        onCancel={onCancel}
      />
    )
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        outputs={[videoOutput]}
      />

      {/* Exercise name overlay */}
      <View style={styles.exerciseOverlay}>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
      </View>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>{tc.recording}</Text>
        </View>
      )}

      {/* Upload overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.uploadText}>{tc.uploading}</Text>
        </View>
      )}

      {/* Controls */}
      <CameraControls
        isRecording={isRecording}
        isUploading={isUploading}
        onCancel={onCancel}
        onRecord={handleRecord}
        onFlip={() => setIsFrontCamera(!isFrontCamera)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  exerciseOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  exerciseName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: colors.overlay,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  recordingText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  uploadText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
})
