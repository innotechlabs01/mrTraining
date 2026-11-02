import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../Badge';

describe('Badge', () => {
  it.each(['neutral', 'success', 'warning', 'error', 'primary'] as const)(
    'renders tone %s',
    (tone) => {
      const { getByText } = render(<Badge text="ACTIVE" tone={tone} />);
      expect(getByText('ACTIVE')).toBeTruthy();
    },
  );
});
