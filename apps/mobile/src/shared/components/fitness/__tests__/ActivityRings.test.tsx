import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityRings } from '../ActivityRings';

test('renders three rings', () => {
  const { getByTestId } = render(
    <ActivityRings move={0.7} exercise={0.5} recovery={0.9} size={200} />
  );
  expect(getByTestId('activity-rings')).toBeTruthy();
});
