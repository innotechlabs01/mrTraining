import React from 'react';
import { render } from '@testing-library/react-native';
import Svg, { Circle } from 'react-native-svg';

describe('react-native-svg', () => {
  it('renders an svg tree without crashing', () => {
    const { UNSAFE_getByType } = render(
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} fill="#FF5C00" />
      </Svg>,
    );
    expect(UNSAFE_getByType(Circle)).toBeTruthy();
  });
});
