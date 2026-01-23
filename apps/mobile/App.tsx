/**
 * BBBeep Mobile App
 * React Native (Expo) 行動應用程式
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { UnreadProvider } from './src/context/UnreadContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { isDark, colors } = useTheme();

  // Custom navigation theme
  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary.DEFAULT,
          background: colors.background,
          card: colors.card.DEFAULT,
          text: colors.foreground,
          border: colors.borderSolid,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary.DEFAULT,
          background: colors.background,
          card: colors.card.DEFAULT,
          text: colors.foreground,
          border: colors.borderSolid,
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <NotificationProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </NotificationProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UnreadProvider>
            <AppContent />
          </UnreadProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
