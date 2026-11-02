import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfileMenu, type MenuItem } from '../ProfileMenu';

function makeItems(overrides: Partial<MenuItem>[] = []): MenuItem[] {
  return [
    { key: 'a', label: 'Modo de entrenamiento', icon: <></>, onPress: jest.fn(), ...overrides[0] },
    { key: 'b', label: 'Contacto de emergencia', icon: <></>, onPress: jest.fn(), value: 'María · 11-5555', ...overrides[1] },
  ];
}

describe('ProfileMenu', () => {
  it('renders group title, labels and values', () => {
    const { getByText } = render(<ProfileMenu title="Mis datos" items={makeItems()} />);
    expect(getByText('Mis datos')).toBeTruthy();
    expect(getByText('Modo de entrenamiento')).toBeTruthy();
    expect(getByText('Contacto de emergencia')).toBeTruthy();
    expect(getByText('María · 11-5555')).toBeTruthy();
  });

  it('triggers onPress per row', () => {
    const items = makeItems();
    const { getByLabelText } = render(<ProfileMenu items={items} />);
    fireEvent.press(getByLabelText('Modo de entrenamiento'));
    expect(items[0].onPress).toHaveBeenCalledTimes(1);
    fireEvent.press(getByLabelText('Contacto de emergencia'));
    expect(items[1].onPress).toHaveBeenCalledTimes(1);
    expect(items[0].onPress).toHaveBeenCalledTimes(1);
  });
});