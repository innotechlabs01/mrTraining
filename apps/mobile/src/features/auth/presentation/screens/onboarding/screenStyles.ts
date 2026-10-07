import { StyleSheet } from 'react-native';
import { colors, radius, spacing, fontFamilies } from '../../../../../shared/theme/tokens';

/**
 * Screen-level styles for the OnboardingScreen shell: hero, progress dots,
 * choices wrapper and bottom navigation. Values are identical to the original
 * monolithic OnboardingScreen stylesheet.
 */
export const screenStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  // Hero — top 45%
  heroArea: {
    width: '100%',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    backgroundColor: colors.surfaceRaised,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,15,14,0.58)',
  },
  heroContent: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroHeading: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 24,
    lineHeight: 28.8,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    marginTop: 8,
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    opacity: 0.85,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.base,
  },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.border },
  // Choices wrapper — rounded top, MR palette
  choicesWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg, flexGrow: 1 },
  // Bottom pill button
  bottom: {
    padding: spacing.lg,
    paddingBottom: 32,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    width: 200,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
  },
  nextBtnOutline: { backgroundColor: 'transparent', borderColor: colors.border },
  nextBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  nextText: { fontSize: 16, fontWeight: '700' },
  nextTextOutline: { color: colors.text },
  nextTextPrimary: { color: colors.base },
  nextDisabled: { opacity: 0.35 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  skipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  backLink: { paddingVertical: 8, marginTop: 2 },
  backText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
