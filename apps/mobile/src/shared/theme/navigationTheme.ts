/**
 * React Navigation theme objects, derived from tokens.ts.
 *
 * Previously lived in the `theme/index.ts` compatibility shim. Consumers now
 * import `darkTheme` from here; the token source of truth remains `tokens.ts`.
 */
import { DarkTheme } from '@react-navigation/native';
import { colors } from './tokens';

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.base,
    card: colors.surface,
    surface: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    primary: colors.primary,
    primaryLight: colors.primaryPressed,
    destructive: colors.error,
    success: colors.success,
    warning: colors.warning,
    border: colors.border,
  },
};