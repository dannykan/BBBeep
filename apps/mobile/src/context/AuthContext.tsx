/**
 * Authentication Context
 * 管理用戶認證狀態
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import LineLogin, { LoginPermission } from '@xmartlabs/react-native-line';
import type { User } from '@bbbeeep/shared';
import { usersApi, authApi } from '@bbbeeep/shared';
import { mobileStorageAdapter } from '../lib/storage-adapter';
import { initializeApiClient, setOnTokenExpired } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, code: string) => Promise<void>;
  passwordLogin: (phone: string, password: string) => Promise<void>;
  appleLogin: () => Promise<void>;
  lineLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化 API Client 和 LINE SDK
  useEffect(() => {
    initializeApiClient();

    // 初始化 LINE SDK
    const lineChannelId = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID || '2008933864';
    LineLogin.setup({ channelId: lineChannelId })
      .catch((error: any) => {
        // 如果已經初始化過會報錯，可以忽略
        if (error.code !== 'SETUP_ALREADY_COMPLETED') {
          console.warn('[LINE_SDK] Setup warning:', error.message);
        }
      });
  }, []);

  // 檢查登入狀態
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = await mobileStorageAdapter.getToken();
      if (token) {
        const userData = await usersApi.getMe();
        setUser(userData);
      }
    } catch (error) {
      // Token 無效，清除
      await mobileStorageAdapter.removeToken();
      await mobileStorageAdapter.removeUser();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Token 過期處理
  useEffect(() => {
    setOnTokenExpired(() => {
      setUser(null);
    });
  }, []);

  // 驗證碼登入
  const login = async (phone: string, code: string) => {
    const response = await authApi.login(phone, code);
    await mobileStorageAdapter.setToken(response.access_token);
    // 登入後立即獲取完整用戶資料（包含點數）
    const fullUserData = await usersApi.getMe();
    await mobileStorageAdapter.setUser(fullUserData);
    setUser(fullUserData);
  };

  // 密碼登入
  const passwordLogin = async (phone: string, password: string) => {
    const response = await authApi.passwordLogin(phone, password);
    await mobileStorageAdapter.setToken(response.access_token);
    // 登入後立即獲取完整用戶資料（包含點數）
    const fullUserData = await usersApi.getMe();
    await mobileStorageAdapter.setUser(fullUserData);
    setUser(fullUserData);
  };

  // Apple Sign-In
  const appleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('未能取得 Apple Identity Token');
      }

      // 組合 fullName
      let fullName: string | undefined;
      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        if (givenName || familyName) {
          fullName = [familyName, givenName].filter(Boolean).join('');
        }
      }

      // 呼叫後端 API
      const response = await authApi.appleLogin(
        credential.identityToken,
        fullName,
        credential.email || undefined
      );

      await mobileStorageAdapter.setToken(response.access_token);
      // 登入後立即獲取完整用戶資料（包含點數）
      const fullUserData = await usersApi.getMe();
      await mobileStorageAdapter.setUser(fullUserData);
      setUser(fullUserData);
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // 用戶取消登入，不需要顯示錯誤
        throw error;
      }
      console.error('[APPLE_LOGIN] Error:', error);
      throw new Error(error.response?.data?.message || 'Apple 登入失敗');
    }
  };

  // LINE Login (使用 LINE SDK)
  const lineLogin = async () => {
    try {
      // 使用 LINE SDK 登入（會自動開啟 LINE App）
      const loginResult = await LineLogin.login({
        scopes: [LoginPermission.Profile, LoginPermission.OpenId],
      });

      if (!loginResult.accessToken?.accessToken) {
        throw new Error('未能取得 LINE Access Token');
      }

      // 呼叫後端 API，傳送 accessToken
      const response = await authApi.lineTokenLogin(loginResult.accessToken.accessToken);

      await mobileStorageAdapter.setToken(response.access_token);
      // 登入後立即獲取完整用戶資料（包含點數）
      const fullUserData = await usersApi.getMe();
      await mobileStorageAdapter.setUser(fullUserData);
      setUser(fullUserData);
    } catch (error: any) {
      console.error('[LINE_LOGIN] Error:', error);
      // LINE SDK 取消登入的錯誤碼
      if (error.code === 'CANCEL' || error.message?.includes('cancel')) {
        return; // 用戶取消，不顯示錯誤
      }
      throw new Error(error.response?.data?.message || error.message || 'LINE 登入失敗');
    }
  };

  // 登出
  const logout = async () => {
    await mobileStorageAdapter.removeToken();
    await mobileStorageAdapter.removeUser();
    setUser(null);
  };

  // 刷新用戶資料
  const refreshUser = async () => {
    try {
      const userData = await usersApi.getMe();
      setUser(userData);
      await mobileStorageAdapter.setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        passwordLogin,
        appleLogin,
        lineLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
