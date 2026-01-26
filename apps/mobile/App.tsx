/**
 * BBBeep Mobile App
 * React Native (Expo) 行動應用程式
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/context/AuthContext';
import { UnreadProvider } from './src/context/UnreadContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';
import CustomSplashScreen from './src/components/CustomSplashScreen';
import { useAnalytics } from './src/hooks/useAnalytics';

// 防止 native splash screen 自動隱藏
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark, colors } = useTheme();
  const { trackScreenView } = useAnalytics();
  const navigationRef = useRef<NavigationContainerRef<ReactNavigation.RootParamList>>(null);
  const routeNameRef = useRef<string | undefined>();

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

  const onNavigationReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  }, []);

  const onNavigationStateChange = useCallback(() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName && currentRouteName) {
      // Track screen view
      trackScreenView(currentRouteName);
    }

    routeNameRef.current = currentRouteName;
  }, [trackScreenView]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={onNavigationReady}
      onStateChange={onNavigationStateChange}
    >
      <NotificationProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </NotificationProvider>
    </NavigationContainer>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // 當 app 準備好後，隱藏 native splash 並顯示 custom splash
  useEffect(() => {
    async function prepare() {
      // 模擬一些初始化工作（如果需要）
      await new Promise(resolve => setTimeout(resolve, 100));
      setAppReady(true);
    }
    prepare();
  }, []);

  // 當 app ready 時隱藏 native splash
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // 顯示 custom splash screen
  if (showSplash && appReady) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }

  // 還在載入中，顯示空白（native splash 還在顯示）
  if (!appReady) {
    return null;
  }

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
