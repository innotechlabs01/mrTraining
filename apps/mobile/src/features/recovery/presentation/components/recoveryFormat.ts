import { colors } from '../../../../shared/theme/tokens';
import { texts } from '../../../../shared/i18n/texts';

const tr = texts.screens.recovery;

export const PLATFORM_LABEL: Record<string, string> = {
  healthkit: 'Apple Health',
  healthconnect: 'Health Connect',
  garmin: 'Garmin Connect',
};

function scoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.error;
}

export function scoreColorOf(score: number | null | undefined): string {
  return score == null ? colors.border : scoreColor(score);
}

export function fmtMin(minutes?: number): string {
  if (!minutes) return '—';
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export function hrvDeltaLabel(today: number | null, baseline: number | null): string | undefined {
  if (today == null || baseline == null || baseline === 0) return undefined;
  const pct = Math.round(((today - baseline) / baseline) * 100);
  return pct >= 0 ? `+${pct}% ${tr.vsBaseline}` : `${pct}% ${tr.vsBaseline}`;
}

export function rhrDeltaLabel(today: number | null, baseline: number | null): string | undefined {
  if (today == null || baseline == null) return undefined;
  const delta = today - baseline;
  return delta === 0 ? tr.equalBaseline : `${delta > 0 ? '+' : ''}${Math.round(delta)} bpm ${tr.vsBaseline}`;
}
