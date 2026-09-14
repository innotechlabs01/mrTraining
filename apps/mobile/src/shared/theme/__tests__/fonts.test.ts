import { FONT_FAMILIES_TO_LOAD, useAppFonts } from '../fonts';
import { fontFamilies } from '../tokens';

// The @expo-google-fonts packages wrap expo-font's useFonts with their own
// React hooks, so they must be mocked directly to stay renderer-free.
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true]),
}));
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: jest.fn(() => [true]),
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
  Inter_800ExtraBold: 'Inter_800ExtraBold',
}));

const interMock = jest.requireMock('@expo-google-fonts/inter') as {
  useFonts: jest.Mock;
};

describe('fonts', () => {
  beforeEach(() => {
    interMock.useFonts.mockReturnValue([true]);
  });

  it('declares every family referenced by tokens', () => {
    // Real package exports are numeric asset ids, not strings — bind each
    // family name to the exact resource exported under that name instead of
    // comparing against the name itself.
    const inter = jest.requireMock('@expo-google-fonts/inter') as Record<string, unknown>;
    const resources = { ...inter };

    for (const family of Object.values(fontFamilies)) {
      expect(FONT_FAMILIES_TO_LOAD).toHaveProperty(family);
      expect(FONT_FAMILIES_TO_LOAD[family]).toBe(resources[family]);
    }
  });

  it('returns false while fonts load', () => {
    interMock.useFonts.mockReturnValue([false]);

    expect(useAppFonts()).toBe(false);
  });

  it('returns true once every font resolves', () => {
    expect(useAppFonts()).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(interMock.useFonts).toHaveBeenCalledWith(
      expect.objectContaining({ Inter_800ExtraBold: 'Inter_800ExtraBold' }),
    );
  });
});