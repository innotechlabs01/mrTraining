import type { QueryClient } from '@tanstack/react-query';
import {
  ATHLETE_PROFILE_QUERY_KEY,
  buildAthleteSectionPayload,
  buildUserNamePayload,
  profileErrorMessage,
  toAthleteProfileRaw,
  updateAthleteSection,
  updateUserName,
  type AthleteProfileRaw,
} from '../athleteProfileApi';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';

jest.mock('../../../../infrastructure/api/client', () => ({
  smartClient: { get: jest.fn(), put: jest.fn() },
}));

const mockedClient = apiClient as unknown as {
  get: jest.Mock;
  put: jest.Mock;
};

const BASE: AthleteProfileRaw = {
  name: 'Ana Gómez',
  email: 'ana@example.com',
  avatar_url: 'https://cdn.example.com/avatar.png',
  sport: 'fitness',
  experience_level: 'intermediate',
  height_cm: 170,
  weight_kg: 65,
  emergency_contact: 'Luis',
  emergency_phone: '11-5555-0000',
  modality: 'virtual',
  schedule_days: 'mon,wed',
  schedule_time: '08:00',
};

function makeQueryClient(cached: unknown): QueryClient {
  return { getQueryData: jest.fn().mockReturnValue(cached) } as unknown as QueryClient;
}

function lastPut(): { path: string; body: AthleteProfileRaw | { name: string; avatar_url: string } } {
  const [path, body] = mockedClient.put.mock.calls[mockedClient.put.mock.calls.length - 1];
  return { path, body };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedClient.put.mockResolvedValue({ data: {} });
});

describe('toAthleteProfileRaw', () => {
  it('coerces a full object and fills missing keys with defaults', () => {
    expect(toAthleteProfileRaw(BASE)).toEqual(BASE);
    expect(toAthleteProfileRaw({ modality: 'presencial' })).toEqual({
      name: '',
      email: '',
      avatar_url: '',
      sport: '',
      experience_level: '',
      height_cm: 0,
      weight_kg: 0,
      emergency_contact: '',
      emergency_phone: '',
      modality: 'presencial',
      schedule_days: '',
      schedule_time: '',
    });
  });

  it('returns null for non-objects', () => {
    expect(toAthleteProfileRaw(null)).toBeNull();
    expect(toAthleteProfileRaw(undefined)).toBeNull();
    expect(toAthleteProfileRaw('nope')).toBeNull();
    expect(toAthleteProfileRaw([])).toBeNull();
  });
});

describe('buildAthleteSectionPayload (no wipe)', () => {
  it('preserves every untouched field when patching modality only', () => {
    expect(buildAthleteSectionPayload(BASE, { modality: 'presencial' })).toEqual({
      ...BASE,
      modality: 'presencial',
    });
  });

  it('preserves every untouched field when patching schedule only', () => {
    const out = buildAthleteSectionPayload(BASE, {
      schedule_days: 'tue,thu',
      schedule_time: '19:30',
    });
    expect(out.schedule_days).toBe('tue,thu');
    expect(out.schedule_time).toBe('19:30');
    expect(out).toMatchObject({
      sport: BASE.sport,
      experience_level: BASE.experience_level,
      height_cm: BASE.height_cm,
      weight_kg: BASE.weight_kg,
      emergency_contact: BASE.emergency_contact,
      emergency_phone: BASE.emergency_phone,
      modality: BASE.modality,
    });
  });

  it('preserves emergency_phone when patching emergency_contact only', () => {
    const out = buildAthleteSectionPayload(BASE, { emergency_contact: 'María' });
    expect(out.emergency_contact).toBe('María');
    expect(out.emergency_phone).toBe('11-5555-0000');
  });

  it('allows intentionally clearing a field with an empty string', () => {
    const out = buildAthleteSectionPayload(BASE, { modality: '' });
    expect(out.modality).toBe('');
    expect(out.sport).toBe(BASE.sport);
  });
});

describe('buildUserNamePayload', () => {
  it('joins first + last name and trims', () => {
    expect(buildUserNamePayload('Ana', 'Pérez', BASE.avatar_url)).toEqual({
      name: 'Ana Pérez',
      avatar_url: BASE.avatar_url,
    });
  });

  it('collapses missing names and null avatar', () => {
    expect(buildUserNamePayload(' ', ' ', null)).toEqual({ name: '', avatar_url: '' });
  });
});

describe('updateUserName — routing', () => {
  it('PUTs /users/me with the current avatar from the cached profile', async () => {
    await updateUserName(makeQueryClient(BASE), { firstName: 'Ana', lastName: 'Pérez' });
    expect(mockedClient.put).toHaveBeenCalledTimes(1);
    expect(lastPut()).toEqual({
      path: '/users/me',
      body: { name: 'Ana Pérez', avatar_url: BASE.avatar_url },
    });
    expect(mockedClient.get).not.toHaveBeenCalled();
  });

  it('falls back to GET /athlete/profile when the cache is cold', async () => {
    mockedClient.get.mockResolvedValue({ data: { athlete_profile: BASE } });
    await updateUserName(makeQueryClient(undefined), { firstName: 'Ana', lastName: 'Gómez' });
    expect(mockedClient.get).toHaveBeenCalledWith('/athlete/profile');
    expect(lastPut().path).toBe('/users/me');
  });
});

describe('updateAthleteSection — routing + read-modify-write', () => {
  it('PUTs /athletes/me with the full merged profile (modality-only)', async () => {
    await updateAthleteSection(makeQueryClient(BASE), { modality: 'hibrido' });
    const { path, body } = lastPut();
    expect(path).toBe('/athletes/me');
    expect(body).toMatchObject({
      modality: 'hibrido',
      sport: BASE.sport,
      height_cm: BASE.height_cm,
      weight_kg: BASE.weight_kg,
      emergency_contact: BASE.emergency_contact,
      emergency_phone: BASE.emergency_phone,
      schedule_days: BASE.schedule_days,
      schedule_time: BASE.schedule_time,
    });
  });

  it('reads the profile via GET when the cache is cold', async () => {
    mockedClient.get.mockResolvedValue({ data: { athlete_profile: BASE } });
    await updateAthleteSection(makeQueryClient(undefined), { schedule_days: 'fri' });
    expect(mockedClient.get).toHaveBeenCalledWith('/athlete/profile');
    expect(lastPut().body).toMatchObject({ schedule_days: 'fri', modality: BASE.modality });
  });

  it('never PUTs (no wipe) when the profile cannot be read', async () => {
    mockedClient.get.mockResolvedValue({ data: {} });
    await expect(updateAthleteSection(makeQueryClient(undefined), { modality: 'virtual' })).rejects.toThrow();
    expect(mockedClient.put).not.toHaveBeenCalled();
  });

  it('uses the shared query key', () => {
    expect(ATHLETE_PROFILE_QUERY_KEY).toEqual(['athlete-profile']);
  });
});

describe('profileErrorMessage', () => {
  const httpError = (status: number, message?: string) => ({
    response: { status, data: message ? { error: { message } } : undefined },
  });

  it('maps a single-field 422 to a human field message', () => {
    expect(profileErrorMessage(httpError(422, 'name: is required'), 'fallback')).toBe(
      'Revisá el nombre',
    );
  });

  it('maps a multi-field 422 to the generic prompt', () => {
    expect(
      profileErrorMessage(httpError(422, 'sport: too long; schedule_time: invalid'), 'fallback'),
    ).toBe('Revisá los datos ingresados');
  });

  it('maps 422 without a parsable field to the generic prompt', () => {
    expect(profileErrorMessage(httpError(422), 'fallback')).toBe('Revisá los datos ingresados');
  });

  it('maps 404, 401 and 5xx to dedicated messages', () => {
    expect(profileErrorMessage(httpError(404), 'fallback')).toContain('No se encontró');
    expect(profileErrorMessage(httpError(401), 'fallback')).toContain('sesión');
    expect(profileErrorMessage(httpError(503), 'fallback')).toContain('servidor');
  });

  it('returns the error message for non-HTTP errors and the fallback otherwise', () => {
    expect(profileErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(profileErrorMessage('weird', 'fallback')).toBe('fallback');
  });
});
