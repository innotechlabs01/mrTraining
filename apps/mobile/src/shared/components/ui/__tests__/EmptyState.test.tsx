import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('loading variant shows activity indicator and no retry', () => {
    const { queryByRole, getByTestId } = render(<EmptyState variant="loading" />);
    expect(getByTestId('empty-state-loading')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('error variant shows retry button and fires onRetry', () => {
    const onRetry = jest.fn();
    const { getByRole, getByText } = render(
      <EmptyState variant="error" message="Could not load" onRetry={onRetry} />,
    );
    expect(getByText('Could not load')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('empty variant shows default message', () => {
    const { getByText } = render(<EmptyState variant="empty" />);
    expect(getByText('Sin datos')).toBeTruthy();
  });
});
