import * as Speech from 'expo-speech';

export async function speak(message: string): Promise<void> {
  if (!message) return;
  Speech.speak(message, { language: 'es', rate: 0.95 });
}