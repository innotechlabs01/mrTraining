/**
 * Unit tests for Paywall component.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Paywall } from '../Paywall';

describe('Paywall', () => {
  it('renders the paywall title', () => {
    const { getByText } = render(<Paywall />);

    expect(getByText('Acceso premium bloqueado')).toBeTruthy();
  });

  it('renders the CTA button', () => {
    const { getByText } = render(<Paywall />);

    expect(getByText('Ver planes y suscribirme')).toBeTruthy();
  });

  it('renders premium features list', () => {
    const { getByText } = render(<Paywall />);

    expect(getByText('Métricas avanzadas')).toBeTruthy();
    expect(getByText('Planes de entrenamiento especializados')).toBeTruthy();
    expect(getByText('Mensajería directa con tu coach')).toBeTruthy();
  });

  it('renders plan price', () => {
    const { getByText } = render(<Paywall />);

    expect(getByText('$49.000 / mes')).toBeTruthy();
  });

  it('renders secondary actions', () => {
    const { getByText } = render(<Paywall />);

    expect(getByText('Restaurar compra')).toBeTruthy();
    expect(getByText('Ayuda y soporte')).toBeTruthy();
  });

  it('calls onPurchaseComplete when CTA is pressed', () => {
    const onPurchaseComplete = jest.fn();
    const { getByText } = render(<Paywall onPurchaseComplete={onPurchaseComplete} />);

    // eslint-disable-next-line @testing-library/no-node-access
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByText('Ver planes y suscribirme'));

    expect(onPurchaseComplete).toHaveBeenCalledTimes(1);
  });
});
