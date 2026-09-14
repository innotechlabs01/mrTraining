import { smartClient as apiClient } from '@infrastructure/api/client';
import { getClerkToken } from '@infrastructure/auth/clerk';
import Constants from 'expo-constants';

export interface ChallengeAttempt {
  id: string;
  challenge_id: string;
  athlete_id: string;
  attempt_number: number;
  status: string;
  video_url?: string;
  created_at: string;
}

function goApiBase(): string {
  return Constants.expoConfig?.extra?.goApiUrl ?? 'http://localhost:8080';
}

/** Join a challenge (creates an in-progress attempt). */
export async function joinChallenge(
  challengeId: string,
  videoConsent: boolean,
  photoConsent: boolean,
): Promise<ChallengeAttempt> {
  const { data } = await apiClient.post<{ data: ChallengeAttempt }>(
    `/athlete/challenges/${challengeId}/join`,
    { video_consent: videoConsent, photo_consent: photoConsent },
  );
  return (data as { data: ChallengeAttempt })?.data ?? data;
}

/** Submit an attempt with metrics. */
export async function submitAttempt(attemptId: string, metrics: Record<string, unknown>): Promise<void> {
  await apiClient.post(`/athlete/challenges/attempts/${attemptId}/submit`, metrics);
}

/** Upload an attempt video to the Go API and return its URL. */
export async function uploadAttemptVideo(attemptId: string, fileUri: string): Promise<string> {
  const token = await getClerkToken();
  const base = goApiBase();

  // vision-camera returns a filesystem path (not a file:// URL). RN FormData
  // uploads require a file:// URI on iOS.
  const uri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'video/mp4',
    name: `${attemptId}.mp4`,
  } as unknown as Blob);

  const res = await fetch(`${base}/api/v1/athlete/challenges/attempts/${attemptId}/video`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error('Video upload failed');
  }

  const json = await res.json();
  return json?.data?.video_url ?? '';
}