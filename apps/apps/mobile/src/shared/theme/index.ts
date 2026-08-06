import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const tokens = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 6, md: 12, lg: 16, xl: 24, full: 9999 },
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    surface: '#F5F5F7',
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    primary: '#FF6B00',
    primaryLight: '#FF8C3D',
    destructive: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    border: '#E5E5EA',
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    surface: '#1C1C1E',
    text: '#F5F5F7',
    textSecondary: '#98989D',
    primary: '#FF8C3D',
    primaryLight: '#FFA866',
    destructive: '#FF453A',
    success: '#30D158',
    warning: '#FFD60A',
    border: '#38383A',
  },
};

export const typography = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
};
