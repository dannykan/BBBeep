import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Border
        border: '#E2E8F0',
        'border-light': '#F1F5F9',

        // Input
        input: {
          DEFAULT: '#FFFFFF',
          border: '#E2E8F0',
          placeholder: '#94A3B8',
          filled: '#F1F5F9',
        },

        // Ring (focus state)
        ring: '#3B82F6',

        // Background & Foreground
        background: '#FFFFFF',
        foreground: '#1E293B',
        surface: '#FFFFFF',

        // Primary (Warm Blue)
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
          light: '#93C5FD',
          soft: '#DBEAFE',
          bg: '#EFF6FF',
          foreground: '#FFFFFF',
        },

        // Secondary
        secondary: {
          DEFAULT: '#64748B',
          foreground: '#FFFFFF',
        },

        // Muted
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },

        // Accent
        accent: {
          vehicle: '#64748B',
          safety: '#F59E0B',
          praise: '#3B82F6',
          info: '#DBEAFE',
        },

        // Destructive
        destructive: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          foreground: '#FFFFFF',
        },

        // Success
        success: {
          DEFAULT: '#22C55E',
          light: '#DCFCE7',
          foreground: '#FFFFFF',
        },

        // Warning
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          foreground: '#92400E',
        },

        // Card
        card: {
          DEFAULT: '#F8FAFC',
          foreground: '#1E293B',
        },

        // Text
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
          tertiary: '#94A3B8',
          muted: '#CBD5E1',
          inverse: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      fontSize: {
        xs: '12px',
        sm: '13px',
        base: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '32px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      transitionDuration: {
        '800': '800ms',
        '1000': '1000ms',
        '1200': '1200ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
