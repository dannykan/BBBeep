/**
 * Web Storage Adapter
 * 使用 localStorage 實作 StorageAdapter 介面
 */

import type { StorageAdapter } from '@bbbeeep/shared';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const webStorageAdapter: StorageAdapter = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser: <T>(): T | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as T;
    } catch {
      return null;
    }
  },

  setUser: <T>(user: T) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
  },
};
