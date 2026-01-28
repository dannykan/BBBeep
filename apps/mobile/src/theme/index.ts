/**
 * Mobile App Theme
 * 基於共用設計 token 的 React Native 專用樣式
 */

import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { typography, spacing, borderRadius, shadows } from '@bbbeeep/shared';
import { lightColors, darkColors, type ThemeColors } from '../context/ThemeContext';

// Re-export shared tokens (except colors which now come from ThemeContext)
export { typography, spacing, borderRadius, shadows };

// Export static colors for backwards compatibility (light theme)
// Components should migrate to useTheme() for dynamic colors
export const colors = lightColors;

// Export both color schemes
export { lightColors, darkColors };
export type { ThemeColors };

// Common text styles
export const textStyles = StyleSheet.create({
  // Headings
  h1: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as TextStyle['fontWeight'],
    color: colors.foreground,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
  },
  h2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: colors.foreground,
    lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
  },
  h3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: colors.foreground,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },

  // Body text
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal as TextStyle['fontWeight'],
    color: colors.foreground,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal as TextStyle['fontWeight'],
    color: colors.foreground,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },

  // Labels
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as TextStyle['fontWeight'],
    color: colors.foreground,
  },

  // Muted text
  muted: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal as TextStyle['fontWeight'],
    color: colors.muted.foreground,
  },
  mutedSmall: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal as TextStyle['fontWeight'],
    color: colors.muted.foreground,
  },

  // Error text
  error: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal as TextStyle['fontWeight'],
    color: colors.destructive.DEFAULT,
  },
});

// Common component styles
export const componentStyles = StyleSheet.create({
  // Screen container
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Content container with padding
  container: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },

  // Card
  card: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },

  // Primary button
  buttonPrimary: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: 44,
  },
  buttonPrimaryText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as TextStyle['fontWeight'],
  },
  buttonPrimaryDisabled: {
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.5,
  },

  // Secondary button
  buttonSecondary: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: 44,
  },
  buttonSecondaryText: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as TextStyle['fontWeight'],
  },

  // Input field
  input: {
    backgroundColor: colors.input.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.input.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    height: 44,
  },
  inputFocused: {
    borderColor: colors.primary.DEFAULT,
  },
  inputError: {
    borderColor: colors.destructive.DEFAULT,
  },

  // Header
  header: {
    backgroundColor: colors.card.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as TextStyle['fontWeight'],
    color: colors.foreground,
    textAlign: 'center' as const,
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[4],
  },

  // Row
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowSpaceBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
});

// Social login button styles
export const socialButtonStyles = StyleSheet.create({
  // LINE button
  lineButton: {
    backgroundColor: '#00B900',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: 44,
  },
  lineButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as TextStyle['fontWeight'],
    marginLeft: spacing[2],
  },

  // Apple button
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: 44,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as TextStyle['fontWeight'],
    marginLeft: spacing[2],
  },
});
