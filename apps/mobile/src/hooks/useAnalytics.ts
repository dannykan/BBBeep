/**
 * Firebase Analytics Hook for React Native
 *
 * 使用方式：
 * 1. 確保已安裝依賴：npx expo install @react-native-firebase/app @react-native-firebase/analytics
 * 2. 確保已放置 GoogleService-Info.plist (iOS) 和 google-services.json (Android)
 * 3. 在元件中使用：const { trackEvent, trackScreenView } = useAnalytics();
 */

import { useCallback } from 'react';

// Firebase Analytics types (will be available after installing @react-native-firebase/analytics)
type Analytics = {
  logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
  logScreenView: (params: { screen_name: string; screen_class: string }) => Promise<void>;
  logLogin: (params: { method: string }) => Promise<void>;
  logSignUp: (params: { method: string }) => Promise<void>;
  setUserId: (id: string | null) => Promise<void>;
  setUserProperties: (properties: Record<string, string | null>) => Promise<void>;
};

// Lazy load analytics to prevent errors when not installed
let analytics: Analytics | null = null;

async function getAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;

  try {
    // Dynamic import to handle case when Firebase is not installed
    const firebaseAnalytics = await import('@react-native-firebase/analytics');
    analytics = firebaseAnalytics.default();
    return analytics;
  } catch {
    console.log('Firebase Analytics not available');
    return null;
  }
}

export function useAnalytics() {
  /**
   * 追蹤自訂事件
   */
  const trackEvent = useCallback(
    async (eventName: string, params?: Record<string, unknown>) => {
      const analyticsInstance = await getAnalytics();
      if (analyticsInstance) {
        await analyticsInstance.logEvent(eventName, params);
      }
    },
    []
  );

  /**
   * 追蹤頁面瀏覽
   */
  const trackScreenView = useCallback(async (screenName: string, screenClass?: string) => {
    const analyticsInstance = await getAnalytics();
    if (analyticsInstance) {
      await analyticsInstance.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
  }, []);

  /**
   * 追蹤用戶登入
   */
  const trackLogin = useCallback(async (method: 'line' | 'phone' | 'apple') => {
    const analyticsInstance = await getAnalytics();
    if (analyticsInstance) {
      await analyticsInstance.logLogin({ method });
    }
  }, []);

  /**
   * 追蹤用戶註冊
   */
  const trackSignUp = useCallback(async (method: 'line' | 'phone' | 'apple') => {
    const analyticsInstance = await getAnalytics();
    if (analyticsInstance) {
      await analyticsInstance.logSignUp({ method });
    }
  }, []);

  /**
   * 追蹤發送提醒訊息
   */
  const trackSendMessage = useCallback(
    async (messageType: string) => {
      await trackEvent('send_message', { message_type: messageType });
    },
    [trackEvent]
  );

  /**
   * 追蹤使用 AI 改寫
   */
  const trackUseAiRewrite = useCallback(async () => {
    await trackEvent('use_ai_rewrite', { feature: 'ai_rewrite' });
  }, [trackEvent]);

  /**
   * 追蹤儲值成功
   */
  const trackPurchase = useCallback(
    async (amount: number, currency: string = 'TWD') => {
      await trackEvent('purchase', { currency, value: amount });
    },
    [trackEvent]
  );

  /**
   * 追蹤完成註冊流程
   */
  const trackCompleteOnboarding = useCallback(async () => {
    await trackEvent('complete_onboarding', { milestone: 'onboarding_complete' });
  }, [trackEvent]);

  /**
   * 設定用戶 ID
   */
  const setUserId = useCallback(async (userId: string | null) => {
    const analyticsInstance = await getAnalytics();
    if (analyticsInstance) {
      await analyticsInstance.setUserId(userId);
    }
  }, []);

  /**
   * 設定用戶屬性
   */
  const setUserProperties = useCallback(async (properties: Record<string, string | null>) => {
    const analyticsInstance = await getAnalytics();
    if (analyticsInstance) {
      await analyticsInstance.setUserProperties(properties);
    }
  }, []);

  return {
    trackEvent,
    trackScreenView,
    trackLogin,
    trackSignUp,
    trackSendMessage,
    trackUseAiRewrite,
    trackPurchase,
    trackCompleteOnboarding,
    setUserId,
    setUserProperties,
  };
}

export default useAnalytics;
