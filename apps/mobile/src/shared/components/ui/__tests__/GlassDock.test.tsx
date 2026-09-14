import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassDock } from '../GlassDock';

const TAB_LABELS: Record<string, string> = { Today: 'Hoy', Plan: 'Plan', Events: 'Eventos', Recovery: 'Recuperación', Profile: 'Perfil' };

function makeProps(active: string, nav?: { navigate?: jest.Mock }): BottomTabBarProps {
  const routes = [
    { key: 'Today', name: 'Today' },
    { key: 'Plan', name: 'Plan' },
    { key: 'Events', name: 'Events' },
    { key: 'Recovery', name: 'Recovery' },
    { key: 'Profile', name: 'Profile' },
  ];
  return {
    state: { index: routes.findIndex((r) => r.name === active), routes, key: 'tab', routeNames: Object.keys(TAB_LABELS), stale: false, type: 'tab', history: [], preloadedRouteKeys: [] },
    descriptors: Object.fromEntries(
      routes.map((r) => [r.key, { options: { tabBarLabel: TAB_LABELS[r.name] } }]),
    ) as BottomTabBarProps['descriptors'],
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false }) as any), navigate: nav?.navigate ?? jest.fn() } as unknown as BottomTabBarProps['navigation'],
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

describe('GlassDock', () => {
  it('renders the five tab labels and marks the active tab', () => {
    const { getByRole } = render(<GlassDock {...makeProps('Today')} />);
    expect(getByRole('tab', { name: 'Hoy' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Plan' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Eventos' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Recuperación' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Perfil' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Hoy' }).props.accessibilityState.selected).toBe(true);
  });

  it('navigates to a non-active tab on press', () => {
    const navigate = jest.fn();
    const { getByRole } = render(<GlassDock {...makeProps('Today', { navigate })} />);
    fireEvent.press(getByRole('tab', { name: 'Plan' }));
    expect(navigate).toHaveBeenCalledWith('Plan');
  });

  it('does not render a central FAB', () => {
    const { queryByTestId } = render(<GlassDock {...makeProps('Events')} />);
    expect(queryByTestId('glass-dock-fab')).toBeNull();
  });
});