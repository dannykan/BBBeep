/**
 * Mobile Storage Adapter
 * 使用 expo-secure-store 實作 StorageAdapter 介面
 * 安全地存儲 token 和用戶資料
 */

import * as SecureStore from 'expo-secure-store';
import type { StorageAdapter } from '@bbbeeep/shared';

const TOKEN_KEY = 'bbbeeep_token';
const USER_KEY = 'bbbeeep_user';

export const mobileStorageAdapter: StorageAdapter = {
  getToken: async () => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  },

  removeToken: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  },

  getUser: async <T>(): Promise<T | null> => {
    try {
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      if (!userStr) return null;
      return JSON.parse(userStr) as T;
    } catch {
      return null;
    }
  },

  setUser: async <T>(user: T) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  },

  removeUser: async () => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  },
};
