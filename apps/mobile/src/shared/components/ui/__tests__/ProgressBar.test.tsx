import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with an accessible progress value', () => {
    const { getByRole } = render(<ProgressBar progress={0.4} />);
    expect(getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 40 });
  });
});
