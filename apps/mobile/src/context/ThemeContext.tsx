/**
 * Theme Context
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
    soft: string;
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
  border: string;
  borderSolid: string;
  input: {
    background: string;
    border: string;
    placeholder: string;
  };
  muted: {
    DEFAULT: string;
    foreground: string;
  };
  accent: {
    vehicle: string;
    safety: string;
    praise: string;
  };
  destructive: {
    DEFAULT: string;
    foreground: string;
  };
  success: {
    DEFAULT: string;
    foreground: string;
  };
  ring: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
}

// Light theme colors
const lightColors: ThemeColors = {
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
  background: '#F6F6F4',
  foreground: '#2A2A2A',
  card: {
    DEFAULT: '#FFFFFF',
    foreground: '#2A2A2A',
  },
  border: 'rgba(0,0,0,0.08)',
  borderSolid: '#E5E5E5',
  input: {
    background: '#ECEBE8',
    border: '#DDDDDD',
    placeholder: '#9CA3AF',
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
  success: {
    DEFAULT: '#4CAF50',
    foreground: '#FFFFFF',
  },
  ring: '#4A6FA5',
  text: {
    primary: '#2A2A2A',
    secondary: '#6B6B6B',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
};

// Dark theme colors
const darkColors: ThemeColors = {
  primary: {
    DEFAULT: '#5A8FD4',
    dark: '#4A7FC4',
    soft: '#1E2A3A',
    foreground: '#FFFFFF',
  },
  secondary: {
    DEFAULT: '#8FA6BF',
    foreground: '#FFFFFF',
  },
  background: '#121212',
  foreground: '#E5E5E5',
  card: {
    DEFAULT: '#1E1E1E',
    foreground: '#E5E5E5',
  },
  border: 'rgba(255,255,255,0.1)',
  borderSolid: '#2E2E2E',
  input: {
    background: '#2A2A2A',
    border: '#3A3A3A',
    placeholder: '#6B6B6B',
  },
  muted: {
    DEFAULT: '#2A2A2A',
    foreground: '#9CA3AF',
  },
  accent: {
    vehicle: '#8FA6BF',
    safety: '#F0B454',
    praise: '#A0B6CF',
  },
  destructive: {
    DEFAULT: '#E57373',
    foreground: '#FFFFFF',
  },
  success: {
    DEFAULT: '#66BB6A',
    foreground: '#FFFFFF',
  },
  ring: '#5A8FD4',
  text: {
    primary: '#E5E5E5',
    secondary: '#9CA3AF',
    muted: '#6B6B6B',
    inverse: '#121212',
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

const STORAGE_KEY = 'bbbeeep_theme_mode';

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
