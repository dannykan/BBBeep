'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics 4 Component
 * 在 layout.tsx 中引入此元件
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}

// Type declarations for gtag
declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

/**
 * 追蹤頁面瀏覽
 */
export function pageview(url: string) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

/**
 * 追蹤自訂事件
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// ============================================
// 預定義的事件追蹤函數
// ============================================

/**
 * 追蹤用戶登入
 */
export function trackLogin(method: 'line' | 'phone' | 'apple') {
  trackEvent('login', 'engagement', method);
}

/**
 * 追蹤用戶註冊
 */
export function trackSignUp(method: 'line' | 'phone' | 'apple') {
  trackEvent('sign_up', 'engagement', method);
}

/**
 * 追蹤發送提醒訊息
 */
export function trackSendMessage(messageType: string) {
  trackEvent('send_message', 'engagement', messageType);
}

/**
 * 追蹤使用 AI 改寫
 */
export function trackUseAiRewrite() {
  trackEvent('use_ai_rewrite', 'engagement', 'ai_rewrite');
}

/**
 * 追蹤儲值成功
 */
export function trackPurchase(amount: number, currency: string = 'TWD') {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      currency: currency,
      value: amount,
    });
  }
}

/**
 * 追蹤完成註冊流程
 */
export function trackCompleteOnboarding() {
  trackEvent('complete_onboarding', 'engagement', 'onboarding_complete');
}

/**
 * 追蹤錯誤
 */
export function trackError(errorType: string, errorMessage: string) {
  trackEvent('error', 'error', `${errorType}: ${errorMessage}`);
}

export default GoogleAnalytics;
