import { colors, typography, spacing, radius, shadows, fontFamilies } from '../tokens';

describe('tokens', () => {
  it('exposes the AthletePro unified color system', () => {
    expect(colors.base).toBe('#0B0F0E');
    expect(colors.surface).toBe('#151B19');
    expect(colors.surfaceRaised).toBe('#1C2320');
    expect(colors.border).toBe('#242B28');
    expect(colors.primary).toBe('#C8FF00');
    expect(colors.primaryPressed).toBe('#A8D900');
    expect(colors.secondary).toBe('#3B9EFF');
    expect(colors.text).toBe('#FFFFFF');
    expect(colors.textSecondary).toBe('#9CA3AF');
    expect(colors.success).toBe('#34D399');
    expect(colors.warning).toBe('#FBBF24');
    expect(colors.error).toBe('#FF6B6B');
  });

  it('exposes the typography scale', () => {
    expect(typography.display.fontSize).toBeGreaterThanOrEqual(30);
    expect(typography.display.fontSize).toBeLessThanOrEqual(40);
    expect(typography.title.fontSize).toBe(20);
    expect(typography.body.fontSize).toBe(16);
    expect(typography.label.fontSize).toBe(13);
    expect(typography.label.letterSpacing).toBe(0.08);
  });

  it('references only fonts loaded by fonts.ts', () => {
    const usedFamilies = Object.values(typography).map((t) => t.fontFamily);
    for (const family of usedFamilies) {
      expect(Object.values(fontFamilies)).toContain(family);
    }
  });

  it('exposes shadow presets', () => {
    expect(shadows.sm).toMatchObject({ shadowOpacity: 0.15, elevation: 2 });
    expect(shadows.md).toMatchObject({ shadowOpacity: 0.25, elevation: 6 });
    expect(Object.keys(shadows.sm)).toContain('shadowColor');
  });

  it('exposes spacing and radius scales', () => {
    expect(spacing).toMatchObject({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 });
    expect(radius).toMatchObject({ sm: 8, md: 12, lg: 16, xl: 24, full: 9999 });
  });
});
