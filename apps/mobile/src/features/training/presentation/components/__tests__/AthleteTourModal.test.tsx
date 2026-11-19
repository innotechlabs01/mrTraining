import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AthleteTourModal } from '../AthleteTourModal';

describe('AthleteTourModal', () => {
  it('renders modal when visible', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <AthleteTourModal visible={true} onClose={onClose} />,
    );

    expect(getByText('1. Tu Plan de Entrenamiento')).toBeTruthy();
    expect(getByText('Paso 1 de 3')).toBeTruthy();
    expect(getByText('Siguiente paso →')).toBeTruthy();
  });

  it('steps through the 3 slides and calls onClose on finish', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <AthleteTourModal visible={true} onClose={onClose} />,
    );

    // Step 1 -> Step 2
    fireEvent.press(getByText('Siguiente paso →'));
    expect(getByText('2. Ejecución y Métricas en Vivo')).toBeTruthy();
    expect(getByText('Paso 2 de 3')).toBeTruthy();

    // Step 2 -> Step 3
    fireEvent.press(getByText('Siguiente paso →'));
    expect(getByText('3. Conexión y Progreso')).toBeTruthy();
    expect(getByText('Paso 3 de 3')).toBeTruthy();
    expect(getByText('¡Comenzar a entrenar!')).toBeTruthy();

    // Step 3 -> finish
    fireEvent.press(getByText('¡Comenzar a entrenar!'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <AthleteTourModal visible={true} onClose={onClose} />,
    );

    fireEvent.press(getByLabelText('Cerrar tour'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
