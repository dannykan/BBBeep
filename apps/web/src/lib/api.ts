/**
 * API Client for Web
 * 初始化共用的 API Client 並導出 axios instance
 */

import { initApiClient, getApiClient } from '@bbbeeep/shared';
import { webStorageAdapter } from './storage-adapter';

// 確保 API URL 有協議前綴
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // 如果沒有協議，自動添加 https://
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// 初始化 API Client
let isInitialized = false;

export function ensureApiClientInitialized() {
  if (isInitialized) return;

  initApiClient({
    baseURL: getApiUrl(),
    storage: webStorageAdapter,
    onTokenExpired: () => {
      // Token 過期時跳轉到登入頁
      if (typeof window !== 'undefined') {
        console.log('Token expired, redirecting to login');
        window.location.href = '/login';
      }
    },
  });

  isInitialized = true;
}

// 在模組載入時立即初始化（Client-side only）
if (typeof window !== 'undefined') {
  ensureApiClientInitialized();
}

// 導出 axios instance（為了向後兼容）
const api = {
  get: <T>(...args: Parameters<ReturnType<typeof getApiClient>['get']>) => {
    ensureApiClientInitialized();
    return getApiClient().get<T>(...args);
  },
  post: <T>(...args: Parameters<ReturnType<typeof getApiClient>['post']>) => {
    ensureApiClientInitialized();
    return getApiClient().post<T>(...args);
  },
  put: <T>(...args: Parameters<ReturnType<typeof getApiClient>['put']>) => {
    ensureApiClientInitialized();
    return getApiClient().put<T>(...args);
  },
  delete: <T>(...args: Parameters<ReturnType<typeof getApiClient>['delete']>) => {
    ensureApiClientInitialized();
    return getApiClient().delete<T>(...args);
  },
  patch: <T>(...args: Parameters<ReturnType<typeof getApiClient>['patch']>) => {
    ensureApiClientInitialized();
    return getApiClient().patch<T>(...args);
  },
};

export default api;
