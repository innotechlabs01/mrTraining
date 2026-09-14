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
import React, { useState, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, CameraRef } from 'react-native-vision-camera'
import { useVideoOutput } from 'react-native-vision-camera'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import { colors, spacing, radius } from '../../theme/tokens'

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
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const cameraRef = useRef<CameraRef>(null)
  const recorderRef = useRef<any>(null)

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission()
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission()

  const device = useCameraDevice(isFrontCamera ? 'front' : 'back')

  const videoOutput = useVideoOutput({
    enableAudio: true,
  })

  const uploadVideo = useCallback(async (videoPath: string) => {
    setIsUploading(true)

    try {
      // vision-camera returns a filesystem path; expo-file-system and RN
      // FormData require a file:// URI (especially on iOS).
      const uri = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`

      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (!fileInfo.exists) {
        throw new Error('Video file not found')
      }

      const formData = new FormData()
      formData.append('file', {
        uri,
        type: 'video/mp4',
        name: `form-${exerciseId}-${Date.now()}.mp4`,
      } as unknown as Blob)
      formData.append('exerciseId', exerciseId)
      if (workoutId) {
        formData.append('workoutId', workoutId)
      }

      const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${API_BASE}/api/athlete/form-recordings/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      onRecordingComplete(result.videoUrl)
    } catch (error) {
      console.error('Upload error:', error)
      Alert.alert('Error', 'No se pudo subir el video')
    } finally {
      setIsUploading(false)
    }
  }, [exerciseId, workoutId, onRecordingComplete])

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      try {
        await recorderRef.current?.stopRecording()
      } catch (err) {
        console.error('Stop recording error:', err)
      }
      return
    }

    setIsRecording(true)

    try {
      const recorder = await videoOutput.createRecorder({})
      recorderRef.current = recorder
      await recorder.startRecording(
        async (filePath: string) => {
          setIsRecording(false)
          recorderRef.current = null
          if (filePath) {
            await uploadVideo(filePath)
          }
        },
        (error: Error) => {
          console.error('Recording error:', error)
          setIsRecording(false)
          recorderRef.current = null
          Alert.alert('Error', 'No se pudo grabar el video')
        },
      )
    } catch (err) {
      console.error('Start recording error:', err)
      setIsRecording(false)
      recorderRef.current = null
      Alert.alert('Error', 'No se pudo iniciar la grabación')
    }
  }, [isRecording, videoOutput, uploadVideo])

  // Request permissions
  if (!hasCameraPermission || !hasMicPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="videocam-off" size={48} color={colors.textSecondary} />
        <Text style={styles.permissionText}>
          Se necesita permiso de cámara y micrófono
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            await requestCameraPermission()
            await requestMicPermission()
          }}
        >
          <Text style={styles.permissionButtonText}>Otorgar Permisos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Cámara no disponible</Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.recordingText}>GRABANDO</Text>
        </View>
      )}

      {/* Upload overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.uploadText}>Subiendo video...</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onCancel} style={styles.controlButton}>
          <Ionicons name="close" size={32} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRecord}
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
          onPress={() => setIsFrontCamera(!isFrontCamera)}
          style={styles.controlButton}
        >
          <Ionicons name="camera-reverse" size={32} color="white" />
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    backgroundColor: '#EF4444',
  },
  recordingText: {
    color: '#EF4444',
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
    borderColor: '#EF4444',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
  },
  recordButtonInnerActive: {
    borderRadius: 8,
    width: 32,
    height: 32,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: spacing.xl,
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  permissionButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
})
