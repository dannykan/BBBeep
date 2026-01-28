/**
 * UBeep Design System - Spacing (Warm Blue)
 * 共用間距定義
 */

export const spacing = {
  // Base spacing scale (in pixels)
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// Component-specific sizes
export const componentSizes = {
  // Button heights
  buttonSm: 40,
  buttonMd: 48,
  buttonLg: 56,

  // Input heights
  inputSm: 40,
  inputMd: 48,
  inputLg: 56,

  // Icon sizes
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,

  // Avatar sizes
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 64,
  avatarXl: 80,

  // Card padding
  cardPadding: 16,

  // Screen padding
  screenPaddingX: 20,
  screenPaddingY: 24,

  // Header
  statusBarHeight: 44,
  headerHeight: 56,

  // Tab bar
  tabBarHeight: 83,
} as const;

// Shadow definitions for React Native
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type ComponentSizes = typeof componentSizes;
export type Shadows = typeof shadows;
