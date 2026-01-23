/**
 * API Client Types
 * 平台無關的介面定義
 */

/**
 * Storage Adapter 介面
 * 不同平台實作自己的 token 存儲機制
 * - Web: localStorage
 * - React Native: AsyncStorage
 */
export interface StorageAdapter {
  getToken(): string | null | Promise<string | null>;
  setToken(token: string): void | Promise<void>;
  removeToken(): void | Promise<void>;
  getUser<T>(): T | null | Promise<T | null>;
  setUser<T>(user: T): void | Promise<void>;
  removeUser(): void | Promise<void>;
}

/**
 * API Client 配置
 */
export interface ApiClientConfig {
  /** API Base URL */
  baseURL: string;
  /** Storage adapter for token management */
  storage: StorageAdapter;
  /** Callback when token expires (optional) */
  onTokenExpired?: () => void;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * API 錯誤響應
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
