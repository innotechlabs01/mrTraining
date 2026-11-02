import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { BentoGrid } from '../BentoGrid';

test('renders children in grid layout', () => {
  const { getByTestId } = render(
    <BentoGrid columns={2} gap={12}>
      <View testID="tile-1" />
      <View testID="tile-2" />
    </BentoGrid>
  );
  expect(getByTestId('tile-1')).toBeTruthy();
  expect(getByTestId('tile-2')).toBeTruthy();
});
