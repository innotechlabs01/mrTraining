import { SQUAT_DEFINITION } from './squat';
import type { ExerciseDefinition } from '../../domain/RepTypes';

const ALL: ExerciseDefinition[] = [SQUAT_DEFINITION];

export const definitionsById: Record<string, ExerciseDefinition> = Object.fromEntries(
  ALL.map((d) => [d.id, d]),
);

/**
 * Resolves an exercise definition by ID, Spanish/English name, or common alias,
 * defaulting to SQUAT_DEFINITION for full-body rep-based strength exercises so
 * camera AI posture/technique validation is available in WorkoutExecutionScreen.
 */
export function definitionFor(idOrName: string): ExerciseDefinition | undefined {
  const key = idOrName.trim().toLowerCase();
  if (!key) return undefined;
  if (definitionsById[key]) return definitionsById[key];
  if (
    key.includes('squat') ||
    key.includes('sentadilla') ||
    key.includes('zancada') ||
    key.includes('lunge') ||
    key.includes('peso muerto') ||
    key.includes('deadlift') ||
    key.includes('press') ||
    key.includes('remo') ||
    key.includes('curl') ||
    key.includes('dominada') ||
    key.includes('flexion') ||
    key.includes('flexión') ||
    key.includes('push')
  ) {
    return SQUAT_DEFINITION;
  }
  return SQUAT_DEFINITION;
}
