import { useState, useRef, useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'
import { texts } from '../../i18n/texts'

const tc = texts.formCamera

type UseVideoUploadOptions = {
  exerciseId: string
  workoutId?: string | undefined
  onRecordingComplete: (recordingUrl: string) => void
}

export function useVideoUpload({ exerciseId, workoutId, onRecordingComplete }: UseVideoUploadOptions) {
  const [isUploading, setIsUploading] = useState(false)
  const mountedRef = useRef(true)

  // Avoid setState after unmount once the camera screen is dismissed.
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

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
      if (mountedRef.current) {
        Alert.alert(tc.errorTitle, tc.uploadFailed)
      }
    } finally {
      if (mountedRef.current) {
        setIsUploading(false)
      }
    }
  }, [exerciseId, workoutId, onRecordingComplete])

  return { isUploading, uploadVideo }
}
