import { useState, useRef, useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import type { useVideoOutput } from 'react-native-vision-camera'
import { texts } from '../../i18n/texts'

const tc = texts.formCamera

type VideoOutput = ReturnType<typeof useVideoOutput>

type UseFormRecorderOptions = {
  videoOutput: VideoOutput
  onRecorded: (filePath: string) => void | Promise<void>
}

export function useFormRecorder({ videoOutput, onRecorded }: UseFormRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const recorderRef = useRef<any>(null)
  // Guard against double-tap while the async start path is in flight:
  // a second tap before `startRecording` resolves would otherwise create
  // a second recorder and double-report state.
  const isStartingRef = useRef(false)
  const mountedRef = useRef(true)

  // Cleanup on unmount: stop any in-flight recording so the camera
  // session is released and no state updates fire after unmount.
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (recorderRef.current) {
        recorderRef.current.stopRecording().catch(() => {})
        recorderRef.current = null
        isStartingRef.current = false
      }
    }
  }, [])

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      try {
        await recorderRef.current?.stopRecording()
      } catch (err) {
        console.error('Stop recording error:', err)
      }
      return
    }

    if (isStartingRef.current) return
    isStartingRef.current = true
    setIsRecording(true)

    try {
      const recorder = await videoOutput.createRecorder({})
      recorderRef.current = recorder
      await recorder.startRecording(
        async (filePath: string) => {
          if (!mountedRef.current) return
          setIsRecording(false)
          recorderRef.current = null
          if (filePath) {
            await onRecorded(filePath)
          }
        },
        (error: Error) => {
          console.error('Recording error:', error)
          if (!mountedRef.current) return
          setIsRecording(false)
          recorderRef.current = null
          Alert.alert(tc.errorTitle, tc.recordingFailed)
        },
      )
      isStartingRef.current = false
    } catch (err) {
      console.error('Start recording error:', err)
      isStartingRef.current = false
      setIsRecording(false)
      recorderRef.current = null
      Alert.alert(tc.errorTitle, tc.startFailed)
    }
  }, [isRecording, videoOutput, onRecorded])

  return { isRecording, handleRecord }
}
