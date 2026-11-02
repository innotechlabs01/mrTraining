import { definitionFor } from '../../../ai/application/definitions';

export function shouldUseAiFor(ex: { mode?: string; name: string }): boolean {
  if (ex.mode && ex.mode !== 'reps') return false;
  return !!definitionFor(ex.name.toLowerCase());
}
