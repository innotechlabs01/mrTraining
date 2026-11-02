import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileHeader } from '../ProfileHeader';

describe('ProfileHeader', () => {
  it('renders initials, name, email and plan', () => {
    const { getByText } = render(
      <ProfileHeader initials="JD" name="Juan Doe" email="juan@test.com" plan="Pro" />,
    );
    expect(getByText('JD')).toBeTruthy();
    expect(getByText('Juan Doe')).toBeTruthy();
    expect(getByText('juan@test.com')).toBeTruthy();
    expect(getByText('Pro')).toBeTruthy();
  });

  it('omits plan pill when no plan is present', () => {
    const { queryByText } = render(
      <ProfileHeader initials="JD" name="Juan Doe" email="juan@test.com" plan={null} />,
    );
    expect(queryByText('Pro')).toBeNull();
    expect(queryByText('JD')).toBeTruthy();
  });
});