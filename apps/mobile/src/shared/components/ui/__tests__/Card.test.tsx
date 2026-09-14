import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Today session</Text>
      </Card>,
    );
    expect(getByText('Today session')).toBeTruthy();
  });
});
