import React from 'react';
import { render } from '@testing-library/react-native';

// expo-video's native module is unavailable in jest. The invalid-URL path
// returns before rendering anything, so a minimal stub keeps the import alive.
jest.mock('expo-video', () => ({
  VideoView: () => null,
  useVideoPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    replaceAsync: jest.fn(),
    duration: 0,
    currentTime: 0,
    playing: false,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
  })),
}));

import { TrackedVideoPlayer } from '../TrackedVideoPlayer';

describe('TrackedVideoPlayer — no black box', () => {
  it('renders nothing for a non-playable URL', () => {
    const { toJSON } = render(
      <TrackedVideoPlayer videoUrl="not-a-url" exerciseId="ex-1" athleteId="ath-1" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for an empty URL', () => {
    const { toJSON } = render(
      <TrackedVideoPlayer videoUrl="" exerciseId="ex-1" athleteId="ath-1" />,
    );
    expect(toJSON()).toBeNull();
  });
});
