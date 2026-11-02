export type EventItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  type?: string;
  modality?: string;
  location?: string;
  description?: string;
  status?: string;
};

export type FormField = {
  id: string;
  label: string;
  kind: string;
  options?: unknown;
  required: boolean;
};

export type RunningInfo = {
  distanceKm?: string | number;
  pace?: string;
  meetingPoint?: string;
};

export type Registration = {
  id: string;
  eventId: string;
  athleteId: string;
  status: 'accepted' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
};

export type FormResponse = {
  id: string;
  fieldId: string;
  value: string;
};

export type EventDetailData = {
  event: EventItem;
  listItems: string[];
  formFields: FormField[];
  running: RunningInfo | null;
  registration: Registration | null;
  responses: FormResponse[];
};

export type AnswerPayload = { fieldId: string; value: string };

const SINGLE_KINDS = new Set(['select', 'option']);
const MULTI_KINDS = new Set(['checkbox', 'multi']);

export function isSingleKind(kind: string): boolean {
  return SINGLE_KINDS.has(kind);
}

export function isMultiKind(kind: string): boolean {
  return MULTI_KINDS.has(kind);
}

export function optionsOf(field: FormField): string[] {
  return Array.isArray(field.options)
    ? field.options.filter((o): o is string => typeof o === 'string')
    : [];
}
