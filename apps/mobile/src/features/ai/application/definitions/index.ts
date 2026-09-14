import { SQUAT_DEFINITION } from './squat';
import type { ExerciseDefinition } from '../../domain/RepTypes';

const ALL: ExerciseDefinition[] = [SQUAT_DEFINITION];

export const definitionsById: Record<string, ExerciseDefinition> = Object.fromEntries(
  ALL.map((d) => [d.id, d]),
);

export function definitionFor(id: string): ExerciseDefinition | undefined {
  return definitionsById[id];
}
