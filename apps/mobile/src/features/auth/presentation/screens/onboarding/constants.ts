export const STEP_COUNT = 13;

export const WEIGHT_MIN = 40;
export const WEIGHT_MAX = 150;
export const WEIGHT_DEFAULT = 75;
export const RULER_ITEM_WIDTH = 52;
export const WEIGHT_VALUES = Array.from(
  { length: WEIGHT_MAX - WEIGHT_MIN + 1 },
  (_, i) => WEIGHT_MIN + i,
);

// Age constants — Figma How Old shows 26-30 centered on 28
export const AGE_MIN = 16;
export const AGE_MAX = 80;
export const AGE_DEFAULT = 28;
export const AGE_VALUES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

// Height constants
export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 220;
export const HEIGHT_DEFAULT_CM = 165;
export const HEIGHT_MIN_FT = 4;
export const HEIGHT_MAX_FT = 7;
export const HEIGHT_RULER_ITEM_WIDTH = 52;
export const HEIGHT_CM_VALUES = Array.from(
  { length: HEIGHT_MAX_CM - HEIGHT_MIN_CM + 1 },
  (_, i) => HEIGHT_MIN_CM + i,
);
export const HEIGHT_FT_VALUES = Array.from(
  { length: Math.round((HEIGHT_MAX_FT - HEIGHT_MIN_FT) * 10) + 1 },
  (_, i) => Math.round((HEIGHT_MIN_FT + i * 0.1) * 10) / 10,
);
