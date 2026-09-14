import type { ExerciseDefinition } from '../../domain/RepTypes';

export const SQUAT_DEFINITION: ExerciseDefinition = {
  id: 'squat',
  name: 'Squat',
  cameraOrientation: 'frontal',
  requiredBodyParts: ['head', 'shoulders', 'hips', 'knees', 'ankles', 'feet'],
  minimumVisibility: 0.5,
  preferredDistance: { minSpread: 0.35, maxSpread: 0.8 },
  framingRules: [
    { bodyPart: 'head', minVisibility: 0.5 },
    { bodyPart: 'hips', minVisibility: 0.5 },
    { bodyPart: 'ankles', minVisibility: 0.5 },
  ],
  movement: { minConfidence: 0.6 },
  rep: {
    topKneeAngleDeg: 160,
    bottomKneeAngleDeg: 100,
    goodKneeAngleDeg: 90,
    minAngleTravelDeg: 30,
    minRepDurationMs: 300,
    maxRepDurationMs: 4000,
  },
  form: {
    kneeValgusToleranceDeg: 10,
    minKneeForGoodDeg: 90,
    maxLateralSway: 0.08,
    minSymmetry: 0.85,
  },
};
