import { Platform, StatusBar } from "react-native";

export const colors = {
  primary: '#FFB800',
  primaryDark: '#E6A800',
  dark: '#1A1A2E',
  darkSecondary: '#252542',
  white: '#FFFFFF',
  offWhite: '#F8F8F8',
  gray: '#F2F2F2',
  gray2: '#E0E0E0',
  // Darkened from #BDBDBD/#9E9E9E — those read at ~1.9:1 and ~2.4:1 contrast
  // against white/light backgrounds, well under the 4.5:1 WCAG AA minimum
  // for text. These values clear ~4.6-5:1 while staying the same neutral gray.
  gray3: '#757575',
  textMuted: '#6B6B6B',
  textDark: '#1A1A2E',
  success: '#4CAF50',
  error: '#F44336',
  info: '#2196F3',
  overlay: 'rgba(26, 26, 46, 0.6)',
};

export const darkColors = {
  primary: '#FFB800',
  primaryDark: '#E6A800',
  dark: '#F0F0F0',
  darkSecondary: '#CCCCCC',
  white: '#1A1A2E',
  offWhite: '#12121F',
  gray: '#252542',
  gray2: '#2E2E50',
  gray3: '#555580',
  textMuted: '#8888AA',
  textDark: '#F0F0F0',
  success: '#4CAF50',
  error: '#F44336',
  info: '#2196F3',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const getColors = (isDark: boolean) => isDark ? darkColors : colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const bottomPadding = Platform.OS === 'android' ? 80 : 48;
export const androidTopPadding = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};