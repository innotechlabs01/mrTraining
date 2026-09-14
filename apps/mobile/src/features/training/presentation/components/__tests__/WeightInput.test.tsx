import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeightInput } from '../WeightInput';

describe('WeightInput', () => {
  const defaultProps = {
    value: 60,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders current weight value', () => {
    const { getByDisplayValue } = render(<WeightInput {...defaultProps} />);
    expect(getByDisplayValue('60')).toBeTruthy();
  });

  it('renders unit label', () => {
    const { getByText } = render(<WeightInput {...defaultProps} />);
    expect(getByText('kg')).toBeTruthy();
  });

  it('renders prescribed weight when provided', () => {
    const { getByText } = render(
      <WeightInput {...defaultProps} prescribedWeight={65} />,
    );
    expect(getByText('Prescrito: 65 kg')).toBeTruthy();
  });

  it('calls onChange with incremented value on +5 press', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <WeightInput {...defaultProps} onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Más 5 kg'));
    expect(onChange).toHaveBeenCalledWith(65);
  });

  it('calls onChange with decremented value on -5 press', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <WeightInput {...defaultProps} onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Menos 5 kg'));
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it('clamps to minimum 0', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <WeightInput {...defaultProps} value={2} onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Menos 5 kg'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('clamps to maximum 500', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <WeightInput {...defaultProps} value={498} onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Más 5 kg'));
    expect(onChange).toHaveBeenCalledWith(500);
  });
});
