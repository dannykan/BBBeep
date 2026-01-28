/**
 * UBeep Design System - Typography (Warm Blue)
 * 共用字型定義
 */

export const typography = {
  // Font family
  fontFamily: {
    primary: 'Inter',
    mono: 'monospace',
  },

  // Font sizes (in pixels)
  fontSize: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 48,
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights (multiplier)
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Predefined text styles
  textStyles: {
    // Headers
    h1: { fontSize: 28, fontWeight: '700', lineHeight: 1.25 },
    h2: { fontSize: 24, fontWeight: '600', lineHeight: 1.25 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 1.375 },
    h4: { fontSize: 18, fontWeight: '600', lineHeight: 1.375 },

    // Body
    body: { fontSize: 16, fontWeight: '400', lineHeight: 1.5 },
    bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 1.5 },

    // Labels
    label: { fontSize: 14, fontWeight: '500', lineHeight: 1.5 },
    labelSmall: { fontSize: 12, fontWeight: '500', lineHeight: 1.5 },

    // Caption
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 1.5 },

    // Button
    button: { fontSize: 16, fontWeight: '600', lineHeight: 1.5 },
    buttonSmall: { fontSize: 14, fontWeight: '500', lineHeight: 1.5 },
  },
} as const;

export type Typography = typeof typography;
