/**
 * Unit tests for AccessGate component.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessGate } from '../AccessGate';
import { useSubscription } from '../../application/useSubscription';

jest.mock('../../application/useSubscription', () => ({
  useSubscription: jest.fn(),
}));

const mockedUseSubscription = useSubscription as jest.MockedFunction<
  typeof useSubscription
>;

describe('AccessGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading indicator when status is loading', () => {
    mockedUseSubscription.mockReturnValue({
      status: 'loading',
      refetch: jest.fn(),
    } as never);

    const { getByText } = render(
      <AccessGate><Text>Premium Content</Text></AccessGate>,
    );

    expect(getByText('Cargando…')).toBeTruthy();
  });

  it('renders error state when status is error', () => {
    mockedUseSubscription.mockReturnValue({
      status: 'error',
      error: new Error('Failed to load'),
      refetch: jest.fn(),
    } as never);

    const { getByText } = render(
      <AccessGate><Text>Premium Content</Text></AccessGate>,
    );

    expect(getByText('Ocurrió un error')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();
  });

  it('renders children when subscription is active', () => {
    mockedUseSubscription.mockReturnValue({
      status: 'success',
      hasActive: true,
      subscription: null,
      membership: {
        hasActiveMembership: true,
        status: 'active',
        isInGracePeriod: false,
        daysRemaining: 12,
        expiresAt: '2026-11-15',
        membership: null,
        membershipId: '',
      },
      refetch: jest.fn(),
    } as never);

    const { getByText, queryByText } = render(
      <AccessGate><Text>Premium Content</Text></AccessGate>,
    );

    expect(getByText('Premium Content')).toBeTruthy();
    expect(queryByText('Acceso premium bloqueado')).toBeNull();
  });

  it('renders Paywall when subscription is inactive', () => {
    mockedUseSubscription.mockReturnValue({
      status: 'success',
      hasActive: false,
      subscription: null,
      membership: {
        hasActiveMembership: false,
        status: 'none',
        isInGracePeriod: false,
        daysRemaining: null,
        expiresAt: null,
        membership: null,
        membershipId: '',
      },
      refetch: jest.fn(),
    } as never);

    const { getByText } = render(
      <AccessGate><Text>Premium Content</Text></AccessGate>,
    );

    expect(getByText('Acceso premium bloqueado')).toBeTruthy();
    expect(getByText('Ver planes y suscribirme')).toBeTruthy();
  });

  it('retries subscription check on retry press', () => {
    const refetch = jest.fn();
    mockedUseSubscription.mockReturnValue({
      status: 'error',
      error: new Error('Failed'),
      refetch,
    } as never);

    const { getByText } = render(
      <AccessGate><Text>Premium Content</Text></AccessGate>,
    );

    fireEvent.press(getByText('Reintentar'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not render children when subscription is inactive', () => {
    mockedUseSubscription.mockReturnValue({
      status: 'success',
      hasActive: false,
      subscription: null,
      membership: {
        hasActiveMembership: false,
        status: 'expired',
        isInGracePeriod: false,
        daysRemaining: null,
        expiresAt: '2026-10-01',
        membership: null,
        membershipId: '',
      },
      refetch: jest.fn(),
    } as never);

    const { queryByText } = render(
      <AccessGate><Text>Premium Content</Text></AccessGate>,
    );

    expect(queryByText('Premium Content')).toBeNull();
  });
});
