/**
 * UBeep Design System - Colors (Warm Blue)
 * 共用顏色定義，供 Web 和 Mobile 使用
 */

export const colors = {
  // Primary - 主要品牌色 (Warm Blue)
  primary: {
    DEFAULT: '#3B82F6',      // 主色
    dark: '#2563EB',         // 深色 (CTA 按鈕)
    light: '#93C5FD',        // 淺色
    soft: '#DBEAFE',         // 柔和背景
    bg: '#EFF6FF',           // 背景色
    foreground: '#FFFFFF',
  },

  // Secondary - 次要色
  secondary: {
    DEFAULT: '#64748B',
    foreground: '#FFFFFF',
  },

  // Background - 背景色
  background: '#FFFFFF',

  // Foreground - 前景色（文字）
  foreground: '#1E293B',

  // Card - 卡片
  card: {
    DEFAULT: '#F8FAFC',
    foreground: '#1E293B',
  },

  // Surface - 表面
  surface: '#FFFFFF',

  // Border - 邊框
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Input - 輸入框
  input: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    placeholder: '#94A3B8',
    filled: '#F1F5F9',
  },

  // Muted - 淡化色
  muted: {
    DEFAULT: '#F1F5F9',
    foreground: '#64748B',
  },

  // Accent - 強調色（依類型）
  accent: {
    vehicle: '#64748B',      // 車況相關
    safety: '#F59E0B',       // 安全警告
    praise: '#3B82F6',       // 讚美
    info: '#DBEAFE',         // 資訊背景
  },

  // Destructive - 警告/錯誤
  destructive: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
    foreground: '#FFFFFF',
  },

  // Success - 成功
  success: {
    DEFAULT: '#22C55E',
    light: '#DCFCE7',
    foreground: '#FFFFFF',
  },

  // Warning - 警告
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    foreground: '#92400E',
  },

  // Ring - Focus 狀態
  ring: '#3B82F6',

  // Text colors
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    muted: '#CBD5E1',
    inverse: '#FFFFFF',
  },

  // Fixed colors (不隨主題變化)
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type Colors = typeof colors;
