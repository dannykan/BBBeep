'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { User, Message, PointHistory } from '@/types';
import { authApi, usersApi, messagesApi, pointsApi } from '@/lib/api-services';

interface AppContextType {
  user: User | null;
  messages: Message[];
  pointHistory: PointHistory[];
  isLoading: boolean;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshPointHistory: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 定義刷新函數（使用 useCallback 避免無限循環）
  const refreshUser = useCallback(async () => {
    try {
      const updated = await usersApi.getMe();
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // 如果 token 失效，清除本地存儲
      if (error instanceof Error && error.message.includes('401')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    try {
      const data = await messagesApi.getAll();
      setMessages(data);
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    }
  }, []);

  const refreshPointHistory = useCallback(async () => {
    try {
      const data = await pointsApi.getHistory();
      setPointHistory(data);
    } catch (error) {
      console.error('Failed to refresh point history:', error);
    }
  }, []);

  // 初始化：檢查是否有保存的 token
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            // 刷新用戶數據（只調用一次）
            await refreshUser();
            await refreshMessages();
            await refreshPointHistory();
          } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只執行一次

  const login = async (phone: string, codeOrToken: string) => {
    try {
      let response;
      // 如果 codeOrToken 是 token（以 'eyJ' 开头），直接使用
      if (codeOrToken.startsWith('eyJ')) {
        // 这是 token，需要获取用户信息
        response = {
          access_token: codeOrToken,
          user: await usersApi.getMe(),
        };
      } else {
        // 这是验证码，调用登录 API
        response = await authApi.login(phone, codeOrToken);
      }
      
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      await refreshMessages();
      await refreshPointHistory();
      toast.success('登入成功');
      router.push(response.user.hasCompletedOnboarding ? '/home' : '/onboarding');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登入失敗');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMessages([]);
    setPointHistory([]);
    router.push('/landing');
    toast.success('已登出');
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      const updated = await usersApi.updateMe(updates);
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      toast.success('更新成功');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失敗');
      throw error;
    }
  };


  return (
    <AppContext.Provider
      value={{
        user,
        messages,
        pointHistory,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser,
        refreshMessages,
        refreshPointHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
