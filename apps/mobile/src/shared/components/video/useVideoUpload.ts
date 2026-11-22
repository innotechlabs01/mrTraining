import { useState, useRef, useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { smartClient } from '@infrastructure/api/client'
import { uploadMediaToR2 } from '@shared/media/mediaService'
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
      const { mediaRef } = await uploadMediaToR2(videoPath, 'form_recording', {
        filename: `form-${exerciseId}-${Date.now()}.mp4`,
        contentType: 'video/mp4',
        ...(workoutId ? { resourceId: workoutId } : {}),
      })

      const { data } = await smartClient.post<{
        data?: { video_url?: string }
        videoUrl?: string
        video_url?: string
      }>('/form-recordings/upload', {
        exerciseId,
        ...(workoutId ? { workoutId } : {}),
        formScore: 0,
        formMetrics: {},
        video_url: mediaRef,
      })

      onRecordingComplete(
        data?.data?.video_url ?? data?.videoUrl ?? data?.video_url ?? mediaRef,
      )
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
