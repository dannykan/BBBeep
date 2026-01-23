/**
 * API Client Factory
 * 建立平台無關的 axios instance
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiClientConfig, StorageAdapter } from './types';

let apiInstance: AxiosInstance | null = null;
let storageAdapter: StorageAdapter | null = null;
let tokenExpiredCallback: (() => void) | undefined;

/**
 * 初始化 API Client
 * 應在應用程式啟動時呼叫一次
 */
export function initApiClient(config: ApiClientConfig): AxiosInstance {
  storageAdapter = config.storage;
  tokenExpiredCallback = config.onTokenExpired;

  apiInstance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - 自動添加 token
  apiInstance.interceptors.request.use(async (requestConfig: InternalAxiosRequestConfig) => {
    if (storageAdapter) {
      const token = await Promise.resolve(storageAdapter.getToken());
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
    }
    return requestConfig;
  });

  // Response interceptor - 處理錯誤
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      // 檢查是否為 token 過期錯誤
      const isTokenExpiredError =
        error.response?.status === 401 &&
        (error.response?.data?.message?.includes('expired') ||
          error.response?.data?.message?.includes('invalid') ||
          error.response?.data?.message?.includes('Unauthorized'));

      // 排除登入相關的 API
      const isAuthEndpoint =
        error.config?.url?.includes('/auth/verify-phone') ||
        error.config?.url?.includes('/auth/check-phone') ||
        error.config?.url?.includes('/auth/reset-verify-count') ||
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/set-password') ||
        error.config?.url?.includes('/auth/reset-password') ||
        error.config?.url?.includes('/auth/line');

      if (isTokenExpiredError && !isAuthEndpoint) {
        // Token 過期，清除存儲並通知應用程式
        if (storageAdapter) {
          await Promise.resolve(storageAdapter.removeToken());
          await Promise.resolve(storageAdapter.removeUser());
        }
        if (tokenExpiredCallback) {
          tokenExpiredCallback();
        }
      }

      return Promise.reject(error);
    }
  );

  return apiInstance;
}

/**
 * 取得 API Client instance
 * 必須先呼叫 initApiClient
 */
export function getApiClient(): AxiosInstance {
  if (!apiInstance) {
    throw new Error('API Client not initialized. Call initApiClient() first.');
  }
  return apiInstance;
}

/**
 * 取得 Storage Adapter
 */
export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    throw new Error('API Client not initialized. Call initApiClient() first.');
  }
  return storageAdapter;
}

/**
 * 重設 API Client (用於登出或測試)
 */
export function resetApiClient(): void {
  apiInstance = null;
  storageAdapter = null;
  tokenExpiredCallback = undefined;
}
