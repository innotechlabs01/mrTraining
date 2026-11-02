/**
 * useRunningAudio — announcements de voz para ejecución de entrenamiento running.
 * Usa expo-speech para anunciar cambios de segmento, objetivos y finalización.
 * No bloquea la UI: reproduce de forma no bloqueante.
 */
import * as Speech from 'expo-speech';
import { useCallback, useRef, useState } from 'react';

export interface UseRunningAudioResult {
  speak: (text: string) => void;
  isSpeaking: boolean;
  stop: () => void;
}

export function useRunningAudio(): UseRunningAudioResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) return;
    if (speakingRef.current) return; // Evitar solapamientos

    speakingRef.current = true;
    setIsSpeaking(true);

    try {
      await Speech.speak(text, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
      });
    } catch (err) {
      console.warn('Error speaking:', err);
    } finally {
      speakingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    speakingRef.current = false;
    setIsSpeaking(false);
    Speech.stop();
  }, []);

  return { speak, isSpeaking, stop };
}
