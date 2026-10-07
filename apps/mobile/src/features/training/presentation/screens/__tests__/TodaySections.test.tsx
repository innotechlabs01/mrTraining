import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SessionsSection, NewsFeedSection, PRsSection, ChallengeSection } from '../TodaySections';
import type { Alert } from '../../../../alerts/alertService';
import type { BlogPost } from '../../../../blog/blogService';
import type { PersonalRecord } from '../../../../gamification/domain/prService';
import { texts } from '../../../../../shared/i18n/texts';

const sessions = [
  { id: 's1', name: 'Gimnasio Mañana', time: '08:00', endTime: '09:00', location: 'Sala A' },
  { id: 's2', name: 'Movilidad', time: '18:00', endTime: '18:30', location: '' },
];

const latestMessage = { userName: 'Coach Ana', message: 'Buen trabajo hoy' };

const posts: BlogPost[] = [
  {
    id: 'b1',
    title: 'Cómo mejorar tu press',
    content: '',
    excerpt: '',
    slug: 'press',
    category: 'training',
    tags: [],
    createdAt: '2026-09-01T00:00:00Z',
    publishedAt: '2026-09-01T00:00:00Z',
    readTimeMinutes: 4,
  },
  {
    id: 'b2',
    title: 'Recuperación activa',
    content: '',
    excerpt: '',
    slug: 'recovery',
    category: 'recovery',
    tags: [],
    createdAt: '2026-09-02T00:00:00Z',
    publishedAt: '2026-09-02T00:00:00Z',
    readTimeMinutes: 3,
  },
];

const alerts: Alert[] = [
  { id: 'a1', type: 'warning', severity: 'high', title: 'Forma a corregir', message: 'Tu lumbar necesita atención.' },
  { id: 'a2', type: 'info', severity: 'low', title: 'Recordatorio', message: 'Agendá tu sesión de mañana.' },
  { id: 'a3', type: 'info', severity: 'low', title: 'Tercera', message: 'No debería verse.' },
];

const baseProps = {
  latestMessage: null,
  posts: [] as BlogPost[],
  alerts: [] as Alert[],
  onPressCommunity: jest.fn(),
  onPressArticles: jest.fn(),
};

describe('SessionsSection', () => {
  it('renders session titles with time + location', () => {
    const { getByText } = render(<SessionsSection sessions={sessions} />);
    expect(getByText('Gimnasio Mañana')).toBeTruthy();
    expect(getByText(/08:00 — 09:00 · Sala A/)).toBeTruthy();
    expect(getByText('Movilidad')).toBeTruthy();
  });

  it('shows empty state when there are no sessions', () => {
    const { getByText } = render(<SessionsSection sessions={[]} />);
    expect(getByText('Sesiones de Hoy')).toBeTruthy();
    expect(getByText('Sin sesiones programadas')).toBeTruthy();
  });
});

describe('NewsFeedSection', () => {
  it('is open by default and reveals feed content', () => {
    const { getByText } = render(<NewsFeedSection {...baseProps} latestMessage={latestMessage} />);
    expect(getByText('Comunidad & Novedades')).toBeTruthy();
    expect(getByText('Buen trabajo hoy')).toBeTruthy();
  });

  it('collapses on toggle and hides feed content', () => {
    const { getByText, queryByText } = render(<NewsFeedSection {...baseProps} latestMessage={latestMessage} />);
    fireEvent.press(getByText('Comunidad & Novedades'));
    expect(queryByText('Buen trabajo hoy')).toBeNull();
  });

  it('re-expands to reveal community message on open', () => {
    const { getByText } = render(<NewsFeedSection {...baseProps} latestMessage={latestMessage} />);
    fireEvent.press(getByText('Comunidad & Novedades'));
    fireEvent.press(getByText('Comunidad & Novedades'));
    expect(getByText('Buen trabajo hoy')).toBeTruthy();
  });

  it('renders articles and fires "Ver todo"', () => {
    const onPressArticles = jest.fn();
    const { getByText, getByRole } = render(
      <NewsFeedSection {...baseProps} posts={posts} onPressArticles={onPressArticles} />,
    );
    expect(getByText('Cómo mejorar tu press')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Ver todo' }));
    expect(onPressArticles).toHaveBeenCalledTimes(1);
  });

  it('renders at most 2 alerts', () => {
    const { getByText, queryByText } = render(<NewsFeedSection {...baseProps} alerts={alerts} />);
    expect(getByText('Forma a corregir')).toBeTruthy();
    expect(getByText('Recordatorio')).toBeTruthy();
    expect(queryByText('Tercera')).toBeNull();
  });

  it('shows empty state when there is no content', () => {
    const { getByText } = render(<NewsFeedSection {...baseProps} />);
    expect(getByText('Comunidad & Novedades')).toBeTruthy();
    expect(getByText('Sin novedades todavía')).toBeTruthy();
  });

  it('fires community press from the chat block', () => {
    const onPressCommunity = jest.fn();
    const { getByText } = render(
      <NewsFeedSection {...baseProps} latestMessage={latestMessage} onPressCommunity={onPressCommunity} />,
    );
    fireEvent.press(getByText('Ver chat'));
    expect(onPressCommunity).toHaveBeenCalledTimes(1);
  });
});

describe('PRsSection', () => {
  const prs: PersonalRecord[] = [
    { exerciseId: 'e1', exerciseName: 'Bench Press', bestValue: 100, unit: 'kg', achievedAt: '2026-09-10T00:00:00Z' },
    { exerciseId: 'e2', exerciseName: 'Squat', bestValue: 150, unit: 'kg', achievedAt: '2026-09-08T00:00:00Z' },
    { exerciseId: 'e3', exerciseName: 'Run 5K', bestValue: 1260, unit: 'sec', achievedAt: '2026-09-01T00:00:00Z' },
    { exerciseId: 'e4', exerciseName: 'Deadlift', bestValue: 180, unit: 'kg', achievedAt: '2026-08-01T00:00:00Z' },
  ];

  it('renders exercise name, value and capped at 3', () => {
    const { getByText, queryByText } = render(<PRsSection prs={prs} />);
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('100 kg')).toBeTruthy();
    expect(queryByText('Deadlift')).toBeNull();
  });

  it('fires "Ver todo" when provided', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PRsSection prs={prs} onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Ver todo' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows empty state without PRs', () => {
    const { getByText } = render(<PRsSection prs={[]} />);
    expect(getByText('Mejores Marcas')).toBeTruthy();
    expect(getByText(texts.screens.todaySections.prsEmpty)).toBeTruthy();
  });
});

describe('ChallengeSection', () => {
  it('shows empty state and fires "Ver todos" when no challenge', () => {
    const onPress = jest.fn();
    const { getByText, getByRole } = render(<ChallengeSection hasChallenge={false} onPressChallenges={onPress} />);
    expect(getByText('Desafíos')).toBeTruthy();
    expect(getByRole('button', { name: 'Ver todos' })).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Ver todos' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders only the header when a challenge exists', () => {
    const { queryByText } = render(<ChallengeSection hasChallenge onPressChallenges={jest.fn()} />);
    expect(queryByText('Desafíos')).toBeTruthy();
  });
});