import React from 'react';
import { render } from '@testing-library/react-native';
import { FormAnalyzer } from '../FormAnalyzer';

describe('FormAnalyzer', () => {
  const defaultMetrics = { depth: 85, alignment: 70, tempo: 90 };

  it('renders score and metrics', () => {
    const { getByText } = render(
      <FormAnalyzer score={75} metrics={defaultMetrics} feedback={null} />,
    );
    expect(getByText('75')).toBeTruthy();
    expect(getByText('Profundidad')).toBeTruthy();
    expect(getByText('Alineación')).toBeTruthy();
    expect(getByText('Tempo')).toBeTruthy();
  });

  it('shows green label for score >= 80', () => {
    const { getByText } = render(
      <FormAnalyzer score={85} metrics={defaultMetrics} feedback={null} />,
    );
    expect(getByText('Buena')).toBeTruthy();
  });

  it('shows yellow label for score 60-79', () => {
    const { getByText } = render(
      <FormAnalyzer score={65} metrics={defaultMetrics} feedback={null} />,
    );
    expect(getByText('Aceptable')).toBeTruthy();
  });

  it('shows red label for score < 60', () => {
    const { getByText } = render(
      <FormAnalyzer score={40} metrics={defaultMetrics} feedback={null} />,
    );
    expect(getByText('Mejorar')).toBeTruthy();
  });

  it('renders feedback when provided', () => {
    const { getByText } = render(
      <FormAnalyzer score={75} metrics={defaultMetrics} feedback="Baja más la cadera" />,
    );
    expect(getByText('Baja más la cadera')).toBeTruthy();
  });

  it('renders nothing when isActive is false', () => {
    const { toJSON } = render(
      <FormAnalyzer score={75} metrics={defaultMetrics} feedback={null} isActive={false} />,
    );
    expect(toJSON()).toBeNull();
  });
});
