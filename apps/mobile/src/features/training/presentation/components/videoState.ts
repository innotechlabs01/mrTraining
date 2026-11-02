/**
 * Video state utilities for exercise cards.
 * Pure logic for selecting the correct video UI state.
 */

import { isPlayableVideoUrl } from '../../../../shared/components/video/isPlayableVideoUrl';

export type VideoState = 'has-video' | 'no-video-with-hint' | 'loading' | 'error';

/**
 * Determines the video state for an exercise based on its videoUrl.
 * Per spec §3: has-video | no-video-with-hint | loading | error
 */
export function getVideoState(videoUrl: string | undefined): VideoState {
  if (!videoUrl) {
    return 'no-video-with-hint';
  }
  if (!isPlayableVideoUrl(videoUrl)) {
    return 'error';
  }
  return 'has-video';
}

/**
 * Type guard for has-video state.
 */
export function hasPlayableVideo(videoUrl: string | undefined): boolean {
  return getVideoState(videoUrl) === 'has-video';
}