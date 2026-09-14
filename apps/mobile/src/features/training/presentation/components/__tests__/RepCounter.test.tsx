import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RepCounter } from '../RepCounter';

describe('RepCounter', () => {
  const defaultProps = {
    currentReps: 5,
    targetReps: 10,
    formScore: 80,
    onIncrement: jest.fn(),
    onDecrement: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders current and target reps', () => {
    const { getByText } = render(<RepCounter {...defaultProps} />);
    expect(getByText('5')).toBeTruthy();
    expect(getByText('/ 10')).toBeTruthy();
  });

  it('renders Forma OK when form score >= threshold', () => {
    const { getByText } = render(<RepCounter {...defaultProps} formScore={80} />);
    expect(getByText('Forma OK')).toBeTruthy();
  });

  it('renders Forma baja when form score < threshold', () => {
    const { getByText } = render(<RepCounter {...defaultProps} formScore={40} />);
    expect(getByText('Forma baja')).toBeTruthy();
  });

  it('calls onIncrement when + pressed', () => {
    const onIncrement = jest.fn();
    const { getByLabelText } = render(
      <RepCounter {...defaultProps} onIncrement={onIncrement} />,
    );
    fireEvent.press(getByLabelText('Incrementar reps'));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('calls onDecrement when - pressed', () => {
    const onDecrement = jest.fn();
    const { getByLabelText } = render(
      <RepCounter {...defaultProps} onDecrement={onDecrement} />,
    );
    fireEvent.press(getByLabelText('Decrementar reps'));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it('blocks auto-increment when form is invalid', () => {
    const onIncrement = jest.fn();
    const { getByLabelText } = render(
      <RepCounter
        {...defaultProps}
        formScore={40}
        isAutoCount
        onIncrement={onIncrement}
      />,
    );
    fireEvent.press(getByLabelText('Incrementar reps'));
    expect(onIncrement).not.toHaveBeenCalled();
  });

  it('allows manual increment even with low form', () => {
    const onIncrement = jest.fn();
    const { getByLabelText } = render(
      <RepCounter
        {...defaultProps}
        formScore={40}
        isAutoCount={false}
        onIncrement={onIncrement}
      />,
    );
    fireEvent.press(getByLabelText('Incrementar reps'));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('shows hint when auto-count and form is low', () => {
    const { getByText } = render(
      <RepCounter {...defaultProps} formScore={40} isAutoCount />,
    );
    expect(getByText('Reps no se cuentan con forma baja')).toBeTruthy();
  });
});
