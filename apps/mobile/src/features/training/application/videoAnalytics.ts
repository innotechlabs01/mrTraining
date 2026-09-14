/**
 * VideoAnalytics — tracks play/pause events, progress milestones, and completion
 * for exercise demo videos. Stores analytics locally and reports to backend
 * (fire-and-forget).
 */
import { smartClient as apiClient } from '../../../infrastructure/api/client';

export type VideoEvent = {
  type: 'play' | 'pause' | 'progress' | 'complete';
  timestamp: number;
  positionSec: number;
  durationSec: number;
  exerciseId: string;
};

export type VideoSession = {
  id: string;
  exerciseId: string;
  startedAt: number;
  events: VideoEvent[];
};

const PROGRESS_MILESTONES = [0.25, 0.5, 0.75, 1.0];
const STORAGE_KEY = 'mr_training.videoAnalytics.v1';

let currentSession: VideoSession | null = null;
let reportedMilestones = new Set<number>();

/**
 * Start tracking a video session.
 */
export function startSession(exerciseId: string): string {
  const id = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  currentSession = {
    id,
    exerciseId,
    startedAt: Date.now(),
    events: [],
  };
  reportedMilestones = new Set();
  return id;
}

/**
 * Record a play event.
 */
export function trackPlay(exerciseId: string, positionSec: number, durationSec: number): void {
  if (!currentSession) return;
  const event: VideoEvent = {
    type: 'play',
    timestamp: Date.now(),
    positionSec,
    durationSec,
    exerciseId,
  };
  currentSession.events.push(event);
  reportToBackend(event);
}

/**
 * Record a pause event.
 */
export function trackPause(exerciseId: string, positionSec: number, durationSec: number): void {
  if (!currentSession) return;
  const event: VideoEvent = {
    type: 'pause',
    timestamp: Date.now(),
    positionSec,
    durationSec,
    exerciseId,
  };
  currentSession.events.push(event);
  reportToBackend(event);
}

/**
 * Check and report progress milestones (25%, 50%, 75%, 100%).
 */
export function trackProgress(
  exerciseId: string,
  positionSec: number,
  durationSec: number,
): void {
  if (!currentSession || durationSec <= 0) return;

  const pct = positionSec / durationSec;

  for (const milestone of PROGRESS_MILESTONES) {
    if (pct >= milestone && !reportedMilestones.has(milestone)) {
      reportedMilestones.add(milestone);
      const event: VideoEvent = {
        type: milestone >= 1.0 ? 'complete' : 'progress',
        timestamp: Date.now(),
        positionSec,
        durationSec,
        exerciseId,
      };
      currentSession.events.push(event);
      reportToBackend(event);
    }
  }
}

/**
 * End the current video session.
 */
export function endSession(): VideoSession | null {
  const session = currentSession;
  currentSession = null;
  reportedMilestones = new Set();
  return session;
}

/**
 * Get the current session.
 */
export function getCurrentSession(): VideoSession | null {
  return currentSession;
}

/**
 * Report event to backend (fire-and-forget).
 */
function reportToBackend(event: VideoEvent): void {
  apiClient
    .post('/athlete/video-analytics', {
      exerciseId: event.exerciseId,
      action: event.type,
      positionSec: event.positionSec,
      durationSec: event.durationSec,
      timestamp: event.timestamp,
    })
    .catch(() => {
      // Non-blocking — analytics failure must never disrupt playback.
    });
}
