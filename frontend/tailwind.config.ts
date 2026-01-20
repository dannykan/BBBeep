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
        border: 'rgba(0,0,0,0.08)',
        input: '#ECEBE8',
        ring: '#4A6FA5',
        background: '#F6F6F4',
        foreground: '#2A2A2A',
        primary: {
          DEFAULT: '#4A6FA5',
          dark: '#3C5E8C',
          soft: '#EAF0F8',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#7A8FA8',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#ECEBE8',
          foreground: '#6B6B6B',
        },
        accent: {
          vehicle: '#7A8FA8',
          safety: '#E6A23C',
          praise: '#8FA6BF',
        },
        destructive: {
          DEFAULT: '#C96A6A',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#2A2A2A',
        },
      },
      borderRadius: {
        lg: '8px',
        md: '4px',
        sm: '4px',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
