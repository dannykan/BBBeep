/**
 * Firebase Analytics Module
 * 独立的 Analytics 模块，可在任何地方使用（不依赖 React hooks）
 *
 * 使用方式：
 * import { analytics } from '../lib/analytics';
 * await analytics.trackEvent('event_name', { param: 'value' });
 */

// Firebase Analytics types
type AnalyticsInstance = {
  logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
  logScreenView: (params: { screen_name: string; screen_class: string }) => Promise<void>;
  logLogin: (params: { method: string }) => Promise<void>;
  logSignUp: (params: { method: string }) => Promise<void>;
  setUserId: (id: string | null) => Promise<void>;
  setUserProperties: (properties: Record<string, string | null>) => Promise<void>;
};

// Lazy load analytics singleton
let analyticsInstance: AnalyticsInstance | null = null;
let initPromise: Promise<AnalyticsInstance | null> | null = null;

async function getAnalytics(): Promise<AnalyticsInstance | null> {
  if (analyticsInstance) return analyticsInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const firebaseAnalytics = await import('@react-native-firebase/analytics');
      analyticsInstance = firebaseAnalytics.default();
      return analyticsInstance;
    } catch (error) {
      console.log('[Analytics] Firebase Analytics not available');
      return null;
    }
  })();

  return initPromise;
}

/**
 * Analytics 追踪模块
 */
export const analytics = {
  /**
   * 追踪自定义事件
   */
  async trackEvent(eventName: string, params?: Record<string, unknown>) {
    const instance = await getAnalytics();
    if (instance) {
      await instance.logEvent(eventName, params);
    }
  },

  /**
   * 追踪页面浏览
   */
  async trackScreenView(screenName: string, screenClass?: string) {
    const instance = await getAnalytics();
    if (instance) {
      await instance.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
  },

  /**
   * 追踪登入
   */
  async trackLogin(method: 'line' | 'phone' | 'apple' | 'password' | 'license_plate') {
    const instance = await getAnalytics();
    if (instance) {
      await instance.logLogin({ method });
    }
    // 同时记录自定义事件以获取更多详情
    await this.trackEvent('login_success', { method });
  },

  /**
   * 追踪注册
   */
  async trackSignUp(method: 'line' | 'phone' | 'apple') {
    const instance = await getAnalytics();
    if (instance) {
      await instance.logSignUp({ method });
    }
    await this.trackEvent('signup_success', { method });
  },

  /**
   * 追踪发送讯息
   */
  async trackSendMessage(params: {
    messageType: string;
    sendMode: 'template' | 'text' | 'voice' | 'ai_optimized';
    pointCost: number;
    category?: string;
  }) {
    await this.trackEvent('send_message', {
      message_type: params.messageType,
      send_mode: params.sendMode,
      point_cost: params.pointCost,
      category: params.category,
    });
  },

  /**
   * 追踪发送流程步骤
   */
  async trackSendFlowStep(step: string, stepNumber: number, entryPoint?: string) {
    await this.trackEvent('send_flow_step', {
      step,
      step_number: stepNumber,
      entry_point: entryPoint,
    });
  },

  /**
   * 追踪发送流程放弃
   */
  async trackSendFlowAbandon(step: string, reason?: string) {
    await this.trackEvent('send_flow_abandon', {
      abandoned_at_step: step,
      reason,
    });
  },

  /**
   * 追踪使用 AI 优化
   */
  async trackAiOptimize(category?: string) {
    await this.trackEvent('ai_optimize_used', { category });
  },

  /**
   * 追踪录音
   */
  async trackVoiceRecord(action: 'start' | 'complete' | 'cancel', duration?: number) {
    await this.trackEvent('voice_record', {
      action,
      duration_seconds: duration,
    });
  },

  /**
   * 追踪 IAP 购买流程
   */
  async trackIapInitiated(productId: string) {
    await this.trackEvent('iap_initiated', { product_id: productId });
  },

  async trackIapComplete(productId: string, points: number, amount?: number) {
    await this.trackEvent('iap_complete', {
      product_id: productId,
      points,
      amount,
      currency: 'TWD',
    });
  },

  async trackIapFailed(productId: string, error: string) {
    await this.trackEvent('iap_failed', {
      product_id: productId,
      error,
    });
  },

  /**
   * 追踪完成新手引导
   */
  async trackOnboardingComplete() {
    await this.trackEvent('onboarding_complete', { milestone: 'onboarding_complete' });
  },

  /**
   * 追踪 App 开启
   */
  async trackAppOpen() {
    await this.trackEvent('app_open', {
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 设置用户 ID
   */
  async setUserId(userId: string | null) {
    const instance = await getAnalytics();
    if (instance) {
      await instance.setUserId(userId);
    }
  },

  /**
   * 设置用户属性
   */
  async setUserProperties(properties: Record<string, string | null>) {
    const instance = await getAnalytics();
    if (instance) {
      await instance.setUserProperties(properties);
    }
  },
};

export default analytics;
