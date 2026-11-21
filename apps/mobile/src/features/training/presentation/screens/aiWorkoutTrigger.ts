import { definitionFor } from '../../../ai/application/definitions';

export function shouldUseAiFor(ex: { mode?: string; name: string }): boolean {
  if (ex.mode === 'time' || ex.mode === 'cardio') return false;
  return !!definitionFor(ex.name.trim().toLowerCase());
}
