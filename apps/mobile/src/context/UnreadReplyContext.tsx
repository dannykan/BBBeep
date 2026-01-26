/**
 * Unread Reply Context
 * 追蹤未讀回覆數量，用於顯示紅點提示
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { messagesApi } from '@bbbeeep/shared';
import { useAuth } from './AuthContext';

interface UnreadReplyContextType {
  unreadReplyCount: number;
  refreshUnreadReplyCount: () => Promise<void>;
  hasUnreadReplies: boolean;
}

const UnreadReplyContext = createContext<UnreadReplyContextType | undefined>(undefined);

export function UnreadReplyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);

  const refreshUnreadReplyCount = useCallback(async () => {
    if (!user) {
      setUnreadReplyCount(0);
      return;
    }

    try {
      const result = await messagesApi.getUnreadReplyCount();
      setUnreadReplyCount(result.count);
    } catch (error) {
      console.error('Failed to fetch unread reply count:', error);
    }
  }, [user]);

  // 當用戶登入時刷新
  useEffect(() => {
    if (user) {
      refreshUnreadReplyCount();
    }
  }, [user, refreshUnreadReplyCount]);

  return (
    <UnreadReplyContext.Provider
      value={{
        unreadReplyCount,
        refreshUnreadReplyCount,
        hasUnreadReplies: unreadReplyCount > 0,
      }}
    >
      {children}
    </UnreadReplyContext.Provider>
  );
}

export function useUnreadReply() {
  const context = useContext(UnreadReplyContext);
  if (!context) {
    throw new Error('useUnreadReply must be used within an UnreadReplyProvider');
  }
  return context;
}
