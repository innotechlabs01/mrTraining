export const LANDMARK_IDS = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export type BodyPart =
  | 'head' | 'shoulders' | 'hips' | 'knees'
  | 'ankles' | 'feet' | 'elbows' | 'wrists';

// Map each named part to the list of landmark indices required to consider it visible.
export const BODY_PART_LANDMARKS: Record<BodyPart, number[]> = {
  head: [LANDMARK_IDS.nose, LANDMARK_IDS.leftShoulder, LANDMARK_IDS.rightShoulder],
  shoulders: [LANDMARK_IDS.leftShoulder, LANDMARK_IDS.rightShoulder],
  hips: [LANDMARK_IDS.leftHip, LANDMARK_IDS.rightHip],
  knees: [LANDMARK_IDS.leftKnee, LANDMARK_IDS.rightKnee],
  ankles: [LANDMARK_IDS.leftAnkle, LANDMARK_IDS.rightAnkle],
  feet: [LANDMARK_IDS.leftFootIndex, LANDMARK_IDS.rightFootIndex],
  elbows: [LANDMARK_IDS.leftElbow, LANDMARK_IDS.rightElbow],
  wrists: [LANDMARK_IDS.leftWrist, LANDMARK_IDS.rightWrist],
};
