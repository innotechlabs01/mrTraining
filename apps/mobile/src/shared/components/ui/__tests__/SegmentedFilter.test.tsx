import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SegmentedFilter } from '../SegmentedFilter';

const OPTIONS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

describe('SegmentedFilter', () => {
  it('marks the current value as selected', () => {
    const { getByLabelText } = render(
      <SegmentedFilter options={OPTIONS} value="month" onChange={() => {}} />,
    );
    expect(getByLabelText('Month').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('Week').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('calls onChange with the pressed option key', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <SegmentedFilter options={OPTIONS} value="week" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Month'));
    expect(onChange).toHaveBeenCalledWith('month');
  });

  it('extends the touch area vertically so each segment reaches 44pt', () => {
    const { getByLabelText } = render(
      <SegmentedFilter options={OPTIONS} value="week" onChange={() => {}} />,
    );
    const { top, bottom } = getByLabelText('Week').props.hitSlop;
    expect(40 + top + bottom).toBeGreaterThanOrEqual(44);
  });
});
