/**
 * CoachingEngine — voice cue prioritization, cooldown, dedup, positive-message variety.
 *
 * Per the public API contract:
 *  - shouldSpeak(event, nowMs) checks cooldown constraints (priority + message + global).
 *  - lastSpokenAt(nowMs) records that speech happened at nowMs (sets global floor).
 *  - static positiveMessages() returns a fresh copy of distinct Spanish coaching phrases.
 */

export interface SpeechEvent {
  message: string;
  priority: number;
  minCooldownMs: number;
}

const POSITIVE_MESSAGES: readonly string[] = [
  '¡Bien!',
  '¡Excelente!',
  '¡Vamos!',
  '¡Perfecto!',
  '¡Sigue así!',
] as const;

export class CoachingEngine {
  private lastSpokenMs = -Infinity;
  private lastByPriority = new Map<number, number>();
  private lastByMessage = new Map<string, number>();

  /**
   * Returns true when BOTH constraints hold:
   *  1. nowMs - max(lastByPriority[priority], lastSpokenMs) >= minCooldownMs
   *  2. nowMs - max(lastByMessage[message], lastSpokenMs) >= minCooldownMs
   */
  shouldSpeak(event: SpeechEvent, nowMs: number): boolean {
    const lastPriority = this.lastByPriority.get(event.priority) ?? -Infinity;
    const lastMessage = this.lastByMessage.get(event.message) ?? -Infinity;
    const effectiveLast = Math.max(lastPriority, lastMessage, this.lastSpokenMs);

    return nowMs - effectiveLast >= event.minCooldownMs;
  }

  /**
   * Consumer calls this AFTER speaking to acknowledge speech happened.
   * Sets the global last-spoken floor.
   */
  lastSpokenAt(nowMs: number): void {
    this.lastSpokenMs = nowMs;
  }

  /**
   * Record a specific event (richer per-key tracking).
   * Sets both the per-priority and per-message timestamps.
   */
  record(event: SpeechEvent, nowMs: number): void {
    this.lastByPriority.set(event.priority, nowMs);
    this.lastByMessage.set(event.message, nowMs);
  }

  /**
   * Returns a fresh array of distinct positive coaching phrases (Spanish).
   * Always returns a new copy to prevent mutation of the internal list.
   */
  static positiveMessages(): string[] {
    return [...POSITIVE_MESSAGES];
  }
}
