import { LANDMARK_IDS, BODY_PART_LANDMARKS } from '../BodyPart';
import { RepState } from '../RepTypes';

describe('LANDMARK_IDS', () => {
  it('matches BlazePose 33 indices for key joints', () => {
    expect(LANDMARK_IDS.nose).toBe(0);
    expect(LANDMARK_IDS.leftShoulder).toBe(11);
    expect(LANDMARK_IDS.leftHip).toBe(23);
    expect(LANDMARK_IDS.leftKnee).toBe(25);
    expect(LANDMARK_IDS.leftAnkle).toBe(27);
    expect(LANDMARK_IDS.rightFootIndex).toBe(32);
  });
});

describe('BODY_PART_LANDMARKS', () => {
  it('maps every named body part to landmark indices', () => {
    expect(BODY_PART_LANDMARKS.head).toEqual([0, 11, 12]);
    expect(BODY_PART_LANDMARKS.shoulders).toEqual([11, 12]);
    expect(BODY_PART_LANDMARKS.hips).toEqual([23, 24]);
    expect(BODY_PART_LANDMARKS.knees).toEqual([25, 26]);
    expect(BODY_PART_LANDMARKS.ankles).toEqual([27, 28]);
  });
});

describe('RepState', () => {
  it('enumerates the rep machine in order', () => {
    expect(RepState.IDLE).toBe('IDLE');
    expect(RepState.READY).toBe('READY');
    expect(RepState.COMPLETED).toBe('COMPLETED');
  });
});
