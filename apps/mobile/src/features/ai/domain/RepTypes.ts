import type { BodyPart } from './BodyPart';

export type CameraPositionStatus = 'POSITION_INVALID' | 'POSITION_ADJUSTING' | 'POSITION_VALID';
export type RepQuality = 'GOOD' | 'REGULAR' | 'BAD' | 'UNKNOWN';
export type RepValidity = 'VALID' | 'INVALID' | 'UNKNOWN';

export enum RepState {
  IDLE = 'IDLE',
  READY = 'READY',
  MOVEMENT_START = 'MOVEMENT_START',
  ECCENTRIC = 'ECCENTRIC',
  BOTTOM = 'BOTTOM',
  CONCENTRIC = 'CONCENTRIC',
  COMPLETED = 'COMPLETED',
}

export type CameraOrientation = 'frontal' | 'lateral' | 'auto';

export interface DistanceBand {
  minSpread: number;
  maxSpread: number;
}

export interface FramingRule {
  bodyPart: BodyPart;
  minVisibility: number;
}

export interface MovementRules {
  minConfidence: number;
}

export interface RepRules {
  topKneeAngleDeg: number;
  bottomKneeAngleDeg: number;
  goodKneeAngleDeg: number;
  minAngleTravelDeg: number;
  minRepDurationMs: number;
  maxRepDurationMs: number;
}

export interface FormRules {
  kneeValgusToleranceDeg: number;
  minKneeForGoodDeg: number;
  maxLateralSway: number;
  minSymmetry: number;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  cameraOrientation: CameraOrientation;
  requiredBodyParts: BodyPart[];
  minimumVisibility: number;
  preferredDistance: DistanceBand;
  framingRules: FramingRule[];
  movement: MovementRules;
  rep: RepRules;
  form: FormRules;
}
