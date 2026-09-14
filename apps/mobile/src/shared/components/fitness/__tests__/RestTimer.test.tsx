import React from 'react';
import { render } from '@testing-library/react-native';
import { RestTimer } from '../RestTimer';

test('renders countdown display', () => {
  const { getByText } = render(
    <RestTimer duration={90} onComplete={() => {}} />
  );
  expect(getByText('1:30')).toBeTruthy();
});
