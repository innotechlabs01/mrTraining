import { smartClient as apiClient } from '@infrastructure/api/client';
import { uploadMediaToR2 } from '@shared/media/mediaService';

export interface ChallengeAttempt {
  id: string;
  challenge_id: string;
  athlete_id: string;
  attempt_number: number;
  status: string;
  video_url?: string;
  created_at: string;
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

/** Upload an attempt video to R2 and attach the media_ref to the attempt. */
export async function uploadAttemptVideo(attemptId: string, fileUri: string): Promise<string> {
  const { mediaRef } = await uploadMediaToR2(fileUri, 'challenge_attempt', {
    filename: `${attemptId}.mp4`,
    contentType: 'video/mp4',
    resourceId: attemptId,
  });

  const { data } = await apiClient.post<{ data?: { video_url?: string }; video_url?: string }>(
    `/athlete/challenges/attempts/${attemptId}/video`,
    { video_url: mediaRef },
  );

  return data?.data?.video_url ?? data?.video_url ?? mediaRef;
}