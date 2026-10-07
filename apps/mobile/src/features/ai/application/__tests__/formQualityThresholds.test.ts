import {
  FORM_QUALITY_GOOD_MIN,
  FORM_QUALITY_REGULAR_MIN,
  qualityForScore,
} from '../FormEngine';

describe('qualityForScore', () => {
  it('exposes the canonical thresholds', () => {
    expect(FORM_QUALITY_GOOD_MIN).toBe(85);
    expect(FORM_QUALITY_REGULAR_MIN).toBe(60);
  });

  it('maps scores at and above 85 to GOOD', () => {
    expect(qualityForScore(100)).toBe('GOOD');
    expect(qualityForScore(85)).toBe('GOOD');
  });

  it('maps scores in [60, 85) to REGULAR', () => {
    expect(qualityForScore(84)).toBe('REGULAR');
    expect(qualityForScore(60)).toBe('REGULAR');
  });

  it('maps scores below 60 to BAD', () => {
    expect(qualityForScore(59)).toBe('BAD');
    expect(qualityForScore(0)).toBe('BAD');
  });

  it('never returns UNKNOWN for a numeric score', () => {
    expect(qualityForScore(-1)).toBe('BAD');
  });
});
