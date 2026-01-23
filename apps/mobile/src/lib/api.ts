/**
 * API Client for Mobile
 * 初始化共用的 API Client
 */

import { initApiClient } from '@bbbeeep/shared';
import { mobileStorageAdapter } from './storage-adapter';

// API Base URL - 可以透過環境變數設定
// 開發時使用本地 API，正式環境使用線上 API
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

let isInitialized = false;
let onTokenExpiredCallback: (() => void) | undefined;

/**
 * 設定 Token 過期時的回調函數
 */
export function setOnTokenExpired(callback: () => void) {
  onTokenExpiredCallback = callback;
}

/**
 * 初始化 API Client
 */
export function initializeApiClient() {
  if (isInitialized) return;

  initApiClient({
    baseURL: API_URL,
    storage: mobileStorageAdapter,
    onTokenExpired: () => {
      console.log('Token expired');
      if (onTokenExpiredCallback) {
        onTokenExpiredCallback();
      }
    },
  });

  isInitialized = true;
}

// 導出 storage adapter 供其他地方使用
export { mobileStorageAdapter };
