import type { Landmark, Pose } from '../domain/Landmark';
import { BODY_PART_LANDMARKS, type BodyPart } from '../domain/BodyPart';
import type { CameraPositionStatus, ExerciseDefinition } from '../domain/RepTypes';
import { frameSpread, avgMid } from './geometry';

export interface CameraCheck {
  status: CameraPositionStatus;
  hint: string | null;
  visibleParts: BodyPart[];
  spread: number;
}

export function assessBody(list: Landmark[], def: ExerciseDefinition): {
  visible: BodyPart[]; missing: BodyPart[];
} {
  const visible: BodyPart[] = [];
  const missing: BodyPart[] = [];
  for (const part of def.requiredBodyParts) {
    const idxs = BODY_PART_LANDMARKS[part];
    const ok = idxs.length > 0 && idxs.every((i) => list[i] && list[i].visibility >= def.minimumVisibility);
    (ok ? visible : missing).push(part);
  }
  return { visible, missing };
}

export function prepare(pose: Pose, def: ExerciseDefinition): CameraCheck {
  if (!pose.detected || pose.landmarks.length === 0) {
    return { status: 'POSITION_INVALID', hint: 'No te detecto. Entra en el cuadro.', visibleParts: [], spread: 0 };
  }
  const list = pose.landmarks;
  const { missing, visible } = assessBody(list, def);
  const defined = list.filter((l): l is Landmark => Boolean(l));
  const spread = frameSpread(defined);

  if (missing.length > 0) {
    return { status: 'POSITION_INVALID', hint: 'Coloca todo tu cuerpo dentro del cuadro.', visibleParts: visible, spread };
  }

  if (spread < def.preferredDistance.minSpread) {
    return { status: 'POSITION_ADJUSTING', hint: 'Acércate un poco.', visibleParts: visible, spread };
  }
  if (spread > def.preferredDistance.maxSpread) {
    return { status: 'POSITION_ADJUSTING', hint: 'Aléjate un poco.', visibleParts: visible, spread };
  }

  for (const rule of def.framingRules) {
    const idxs = BODY_PART_LANDMARKS[rule.bodyPart];
    const ok = idxs.every((i) => list[i] && list[i].visibility >= rule.minVisibility);
    if (!ok) {
      return { status: 'POSITION_ADJUSTING', hint: 'Coloca la cámara un poco más abajo.', visibleParts: visible, spread };
    }
  }

  return { status: 'POSITION_VALID', hint: null, visibleParts: visible, spread };
}
