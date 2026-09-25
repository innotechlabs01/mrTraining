import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TodayHeader } from '../TodayHeader';

const MONTH_RE = /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/;

it('renders greeting with the athlete first name', () => {
  const { getByText } = render(
    <TodayHeader firstName="Lucas" onSearch={jest.fn()} onNotifications={jest.fn()} onProfile={jest.fn()} />,
  );
  expect(getByText(/Hola,/)).toBeTruthy();
  expect(getByText(/Lucas/)).toBeTruthy();
});

it('renders today date', () => {
  const { getByText } = render(
    <TodayHeader firstName="Lucas" onSearch={jest.fn()} onNotifications={jest.fn()} onProfile={jest.fn()} />,
  );
  expect(getByText(MONTH_RE)).toBeTruthy();
});

it('fires the three quick actions', () => {
  const onSearch = jest.fn();
  const onNotifications = jest.fn();
  const onProfile = jest.fn();
  const { getByRole } = render(
    <TodayHeader firstName="Lucas" onSearch={onSearch} onNotifications={onNotifications} onProfile={onProfile} />,
  );

  fireEvent.press(getByRole('button', { name: 'Buscar' }));
  fireEvent.press(getByRole('button', { name: 'Notificaciones' }));
  fireEvent.press(getByRole('button', { name: 'Perfil' }));

  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onNotifications).toHaveBeenCalledTimes(1);
  expect(onProfile).toHaveBeenCalledTimes(1);
});