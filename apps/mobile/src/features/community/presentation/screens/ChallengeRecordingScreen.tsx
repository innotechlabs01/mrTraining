import React, { useState, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, CameraRef, useVideoOutput } from 'react-native-vision-camera'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { colors, spacing, radius } from '../../../../shared/theme/tokens'
import { uploadAttemptVideo, submitAttempt } from '@features/challenge/challengeService'
import { useQueryClient } from '@tanstack/react-query'
import type { RootStackParamList } from '../../../../navigation/Navigation'

type Nav = NativeStackNavigationProp<RootStackParamList>
type RecordingRoute = RouteProp<RootStackParamList, 'ChallengeRecording'>

export function ChallengeRecordingScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<RecordingRoute>()
  const { challengeId, attemptId } = route.params
  const queryClient = useQueryClient()

  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const cameraRef = useRef<CameraRef>(null)
  const recorderRef = useRef<any>(null)

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission()
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission()

  const device = useCameraDevice('front')
  const videoOutput = useVideoOutput({ enableAudio: true })

  const finishFlow = useCallback(async (videoUrl: string) => {
    await submitAttempt(attemptId, {
      video_url: videoUrl,
      sets_completed: 0,
      reps_completed: 0,
    })
    await queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] })
    navigation.goBack()
  }, [attemptId, challengeId, queryClient, navigation])

  const uploadVideo = useCallback(async (filePath: string) => {
    setIsUploading(true)
    try {
      const videoUrl = await uploadAttemptVideo(attemptId, filePath)
      await finishFlow(videoUrl)
    } catch (err) {
      console.error('Challenge video error:', err)
      Alert.alert('Error', 'No se pudo procesar el intento.')
      setIsUploading(false)
    }
  }, [attemptId, finishFlow])

  const handleRecord = useCallback(async () => {
    // Second tap: stop the active recording. The recorder's
    // onRecordingFinished callback handles upload + submit.
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
          Alert.alert('Error', 'No se pudo grabar el video.')
        },
      )
    } catch (err) {
      console.error('Start recording error:', err)
      setIsRecording(false)
      recorderRef.current = null
      Alert.alert('Error', 'No se pudo iniciar la grabación.')
    }
  }, [isRecording, videoOutput, uploadVideo])

  if (!hasCameraPermission || !hasMicPermission) {
    return (
      <View style={styles.center}>
        <Ionicons name="videocam-off" size={48} color={colors.textSecondary} />
        <Text style={styles.permissionText}>Se necesita permiso de cámara y micrófono</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={async () => { await requestCameraPermission(); await requestMicPermission() }}>
          <Text style={styles.permissionButtonText}>Otorgar permisos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Cámara no disponible</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={styles.camera} device={device} isActive={true} outputs={[videoOutput]} />

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>GRABANDO</Text>
        </View>
      )}

      {isUploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.uploadText}>Procesando intento…</Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.controlButton}>
          <Ionicons name="close" size={32} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRecord}
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          disabled={isUploading}
        >
          <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
        </TouchableOpacity>

        <View style={styles.controlButton} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: spacing.xl },
  permissionText: { color: colors.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 16 },
  permissionButton: { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  permissionButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  cancelButton: { marginTop: 16 },
  cancelButtonText: { color: colors.textSecondary, fontSize: 14 },
  recordingIndicator: { position: 'absolute', top: 100, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
  recordingText: { color: '#EF4444', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  uploadText: { color: 'white', fontSize: 16, marginTop: 12 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 40, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  controlButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center', marginHorizontal: 30 },
  recordButtonActive: { borderColor: '#EF4444' },
  recordButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444' },
  recordButtonInnerActive: { borderRadius: 8, width: 32, height: 32 },
})