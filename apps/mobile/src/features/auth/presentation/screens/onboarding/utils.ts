import {
  AGE_MAX,
  AGE_MIN,
  HEIGHT_MAX_CM,
  HEIGHT_MAX_FT,
  HEIGHT_MIN_CM,
  HEIGHT_MIN_FT,
  WEIGHT_MAX,
  WEIGHT_MIN,
} from './constants';

export const clampWeight = (v: number) => Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, v));

export const clampAge = (v: number) => Math.min(AGE_MAX, Math.max(AGE_MIN, v));

export const clampHeight = (v: number, unit: 'CM' | 'FT') => {
  if (unit === 'CM') return Math.min(HEIGHT_MAX_CM, Math.max(HEIGHT_MIN_CM, v));
  // FT mode: step 0.1, keep 1 decimal
  const rounded = Math.round(v * 10) / 10;
  return Math.min(HEIGHT_MAX_FT, Math.max(HEIGHT_MIN_FT, rounded));
};

export const formatHeightDisplay = (value: number, unit: 'CM' | 'FT') => {
  if (unit === 'CM') return { number: String(value), unitLabel: 'CM' };
  // Show FT in imperial style, e.g. 5'5"
  const totalInches = Math.round(value * 12);
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return { number: `${ft}'${inch}"`, unitLabel: '' };
};
