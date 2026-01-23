/**
 * BBBeep Design System - Colors
 * 共用顏色定義，供 Web 和 Mobile 使用
 */

export const colors = {
  // Primary - 主要品牌色
  primary: {
    DEFAULT: '#4A6FA5',
    dark: '#3C5E8C',
    soft: '#EAF0F8',
    foreground: '#FFFFFF',
  },

  // Secondary - 次要色
  secondary: {
    DEFAULT: '#7A8FA8',
    foreground: '#FFFFFF',
  },

  // Background - 背景色
  background: '#F6F6F4',

  // Foreground - 前景色（文字）
  foreground: '#2A2A2A',

  // Card - 卡片
  card: {
    DEFAULT: '#FFFFFF',
    foreground: '#2A2A2A',
  },

  // Border - 邊框
  border: 'rgba(0,0,0,0.08)',
  borderSolid: '#E5E5E5',

  // Input - 輸入框
  input: {
    background: '#ECEBE8',
    border: '#DDDDDD',
    placeholder: '#9CA3AF',
  },

  // Muted - 淡化色
  muted: {
    DEFAULT: '#ECEBE8',
    foreground: '#6B6B6B',
  },

  // Accent - 強調色（依類型）
  accent: {
    vehicle: '#7A8FA8',
    safety: '#E6A23C',
    praise: '#8FA6BF',
  },

  // Destructive - 警告/錯誤
  destructive: {
    DEFAULT: '#C96A6A',
    foreground: '#FFFFFF',
  },

  // Success - 成功
  success: {
    DEFAULT: '#4CAF50',
    foreground: '#FFFFFF',
  },

  // Ring - Focus 狀態
  ring: '#4A6FA5',

  // Text colors
  text: {
    primary: '#2A2A2A',
    secondary: '#6B6B6B',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
} as const;

export type Colors = typeof colors;
