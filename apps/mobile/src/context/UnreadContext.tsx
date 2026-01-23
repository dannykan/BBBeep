/**
 * Unread Context
 * 提供未讀訊息數量給整個 App 使用
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { messagesApi } from '@bbbeeep/shared';
import { useAuth } from './AuthContext';

interface UnreadContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const messages = await messagesApi.getAll();
      const count = messages.filter((m) => !m.read).length;
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const context = useContext(UnreadContext);
  if (context === undefined) {
    throw new Error('useUnread must be used within an UnreadProvider');
  }
  return context;
}
