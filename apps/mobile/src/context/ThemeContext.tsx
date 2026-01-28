/**
 * Theme Context - UBeep Warm Blue
 * 管理 App 的主題模式（淺色/深色/跟隨系統）
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Theme mode options
export type ThemeMode = 'light' | 'dark' | 'system';

// Color scheme (actual theme being used)
export type ColorScheme = 'light' | 'dark';

// Theme colors type definition
export interface ThemeColors {
  primary: {
    DEFAULT: string;
    dark: string;
    light: string;
    soft: string;
    bg: string;
    foreground: string;
  };
  secondary: {
    DEFAULT: string;
    foreground: string;
  };
  background: string;
  foreground: string;
  card: {
    DEFAULT: string;
    foreground: string;
  };
  surface: string;
  border: string;
  borderLight: string;
  input: {
    background: string;
    border: string;
    placeholder: string;
    filled: string;
  };
  muted: {
    DEFAULT: string;
    foreground: string;
  };
  accent: {
    vehicle: string;
    safety: string;
    praise: string;
    info: string;
  };
  destructive: {
    DEFAULT: string;
    light: string;
    foreground: string;
  };
  success: {
    DEFAULT: string;
    light: string;
    foreground: string;
  };
  warning: {
    DEFAULT: string;
    light: string;
    foreground: string;
  };
  ring: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    inverse: string;
  };
}

// Light theme colors (Warm Blue)
const lightColors: ThemeColors = {
  primary: {
    DEFAULT: '#3B82F6',
    dark: '#2563EB',
    light: '#93C5FD',
    soft: '#DBEAFE',
    bg: '#EFF6FF',
    foreground: '#FFFFFF',
  },
  secondary: {
    DEFAULT: '#64748B',
    foreground: '#FFFFFF',
  },
  background: '#FFFFFF',
  foreground: '#1E293B',
  card: {
    DEFAULT: '#F8FAFC',
    foreground: '#1E293B',
  },
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  input: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    placeholder: '#94A3B8',
    filled: '#F1F5F9',
  },
  muted: {
    DEFAULT: '#F1F5F9',
    foreground: '#64748B',
  },
  accent: {
    vehicle: '#64748B',
    safety: '#F59E0B',
    praise: '#3B82F6',
    info: '#DBEAFE',
  },
  destructive: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
    foreground: '#FFFFFF',
  },
  success: {
    DEFAULT: '#22C55E',
    light: '#DCFCE7',
    foreground: '#FFFFFF',
  },
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    foreground: '#92400E',
  },
  ring: '#3B82F6',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    muted: '#CBD5E1',
    inverse: '#FFFFFF',
  },
};

// Dark theme colors (Pure Black OLED)
const darkColors: ThemeColors = {
  primary: {
    DEFAULT: '#60A5FA',
    dark: '#3B82F6',
    light: '#93C5FD',
    soft: '#1C2D4D',
    bg: '#0A1628',
    foreground: '#FFFFFF',
  },
  secondary: {
    DEFAULT: '#8E8E93',
    foreground: '#FFFFFF',
  },
  background: '#000000',
  foreground: '#FFFFFF',
  card: {
    DEFAULT: '#1C1C1E',
    foreground: '#FFFFFF',
  },
  surface: '#1C1C1E',
  border: '#38383A',
  borderLight: '#48484A',
  input: {
    background: '#1C1C1E',
    border: '#38383A',
    placeholder: '#636366',
    filled: '#2C2C2E',
  },
  muted: {
    DEFAULT: '#2C2C2E',
    foreground: '#8E8E93',
  },
  accent: {
    vehicle: '#8E8E93',
    safety: '#FFD60A',
    praise: '#60A5FA',
    info: '#1C2D4D',
  },
  destructive: {
    DEFAULT: '#FF453A',
    light: '#3A1618',
    foreground: '#FFFFFF',
  },
  success: {
    DEFAULT: '#30D158',
    light: '#0D3318',
    foreground: '#FFFFFF',
  },
  warning: {
    DEFAULT: '#FFD60A',
    light: '#3D3005',
    foreground: '#000000',
  },
  ring: '#60A5FA',
  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',
    tertiary: '#636366',
    muted: '#48484A',
    inverse: '#000000',
  },
};

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'ubeep_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme mode on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await SecureStore.getItemAsync(STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemeMode();
  }, []);

  // Calculate actual color scheme based on mode
  const colorScheme: ColorScheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  // Get colors based on color scheme
  const colors = useMemo(() => {
    return colorScheme === 'dark' ? darkColors : lightColors;
  }, [colorScheme]);

  const isDark = colorScheme === 'dark';

  // Set theme mode and save to storage
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  }, []);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colorScheme,
        colors,
        setThemeMode,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export color schemes for external use
export { lightColors, darkColors };
