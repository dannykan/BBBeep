/**
 * BBBeep Mobile App
 * React Native (Expo) 行動應用程式
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// 忽略 IAP 在模擬器上的錯誤（正式環境會正常運作）
LogBox.ignoreLogs([
  '[RN-IAP]',
  'Connection not initialized',
]);

import { AuthProvider } from './src/context/AuthContext';
import { UnreadProvider } from './src/context/UnreadContext';
import { UnreadReplyProvider } from './src/context/UnreadReplyContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { DraftProvider } from './src/context/DraftContext';
import { SendProvider } from './src/context/SendContext';
import { VoicePreloadProvider } from './src/context/VoicePreloadContext';
import RootNavigator from './src/navigation/RootNavigator';
import CustomSplashScreen from './src/components/CustomSplashScreen';
import { ForceUpdateModal } from './src/components/ForceUpdateModal';
import { useAnalytics } from './src/hooks/useAnalytics';
import { analytics } from './src/lib/analytics';
import { initializeApiClient } from './src/lib/api';
import { initProfanitySync } from './src/lib/profanitySync';
import { appVersionApi, VersionCheckResponse } from '@bbbeeep/shared';

// 初始化 API Client（同步執行，確保所有 Provider 的 useEffect 執行前已完成）
initializeApiClient();

// 初始化詞庫同步（背景執行，不阻擋 App 啟動）
initProfanitySync();

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
          border: colors.border,
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
          border: colors.border,
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
  const [forceUpdate, setForceUpdate] = useState<VersionCheckResponse | null>(null);

  // 當 app 準備好後，隱藏 native splash 並顯示 custom splash
  useEffect(() => {
    async function prepare() {
      // 模擬一些初始化工作（如果需要）
      await new Promise(resolve => setTimeout(resolve, 100));
      setAppReady(true);
    }
    prepare();
  }, []);

  // 檢查 App 版本
  useEffect(() => {
    async function checkAppVersion() {
      try {
        const appVersion = Constants.expoConfig?.version || '1.0.0';

        // 只在 iOS 和 Android 上檢查版本
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
          return;
        }

        const platform = Platform.OS;
        const result = await appVersionApi.checkVersion(platform, appVersion);

        // 只有當 forceUpdate=true 且 needsUpdate=true 才顯示強制更新
        if (result.forceUpdate && result.needsUpdate) {
          setForceUpdate(result);
        }
      } catch (error) {
        // 版本檢查失敗時不阻擋用戶使用 App
        console.warn('Version check failed:', error);
      }
    }

    if (appReady) {
      checkAppVersion();
    }
  }, [appReady]);

  // 當 app ready 時隱藏 native splash 並追踪 app 開啟
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
      // Analytics 追踪 app 開啟
      analytics.trackAppOpen();
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
        {/* 強制更新 Modal（在 ThemeProvider 內以使用主題） */}
        {forceUpdate && (
          <ForceUpdateModal
            visible={true}
            updateUrl={forceUpdate.updateUrl}
            updateMessage={forceUpdate.updateMessage}
            currentVersion={forceUpdate.currentVersion}
          />
        )}
        <AuthProvider>
          <VoicePreloadProvider>
            <UnreadProvider>
              <UnreadReplyProvider>
                <DraftProvider>
                  <SendProvider>
                    <AppContent />
                  </SendProvider>
                </DraftProvider>
              </UnreadReplyProvider>
            </UnreadProvider>
          </VoicePreloadProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
