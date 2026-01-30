/**
 * VoicePreloadContext - 語音預載管理
 *
 * 在 App 啟動時背景預載用戶最近的語音訊息，
 * 讓用戶點擊播放時能立即播放，無需等待載入。
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useAuth } from './AuthContext';
import { messagesApi } from '@bbbeeep/shared';

// 預載設定
const MAX_PRELOAD_INBOX = 5;  // 預載最近 5 則收到的語音
const MAX_PRELOAD_SENT = 3;   // 預載最近 3 則發送的語音
const MAX_CACHE_SIZE = 10;    // 最多快取 10 個音訊

interface PreloadedAudio {
  sound: Audio.Sound;
  url: string;
  loadedAt: number;
}

interface VoicePreloadContextType {
  getPreloadedSound: (url: string) => Audio.Sound | null;
  preloadAudio: (url: string) => Promise<Audio.Sound | null>;
  releaseSound: (url: string) => void;
}

const VoicePreloadContext = createContext<VoicePreloadContextType | null>(null);

export function VoicePreloadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const cacheRef = useRef<Map<string, PreloadedAudio>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());

  // 清理所有快取的音訊
  const clearCache = useCallback(async () => {
    const cache = cacheRef.current;
    for (const [, item] of cache) {
      try {
        await item.sound.unloadAsync();
      } catch (e) {
        // 忽略錯誤
      }
    }
    cache.clear();
  }, []);

  // 移除最舊的快取項目
  const evictOldest = useCallback(async () => {
    const cache = cacheRef.current;
    if (cache.size < MAX_CACHE_SIZE) return;

    // 找出最舊的項目
    let oldest: { url: string; loadedAt: number } | null = null;
    for (const [url, item] of cache) {
      if (!oldest || item.loadedAt < oldest.loadedAt) {
        oldest = { url, loadedAt: item.loadedAt };
      }
    }

    if (oldest) {
      const item = cache.get(oldest.url);
      if (item) {
        try {
          await item.sound.unloadAsync();
        } catch (e) {
          // 忽略錯誤
        }
        cache.delete(oldest.url);
      }
    }
  }, []);

  // 預載單一音訊
  const preloadAudio = useCallback(async (url: string): Promise<Audio.Sound | null> => {
    if (!url) return null;

    // 已經在快取中
    const cached = cacheRef.current.get(url);
    if (cached) {
      return cached.sound;
    }

    // 正在載入中
    if (loadingRef.current.has(url)) {
      return null;
    }

    try {
      loadingRef.current.add(url);

      // 確保有空間
      await evictOldest();

      // 設定音訊模式
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false, progressUpdateIntervalMillis: 50 },
        undefined,
        false // downloadFirst: false 啟用串流模式，加速載入
      );

      cacheRef.current.set(url, {
        sound,
        url,
        loadedAt: Date.now(),
      });

      return sound;
    } catch (err) {
      console.warn('[VoicePreload] Failed to preload:', url, err);
      return null;
    } finally {
      loadingRef.current.delete(url);
    }
  }, [evictOldest]);

  // 取得預載的音訊
  const getPreloadedSound = useCallback((url: string): Audio.Sound | null => {
    const cached = cacheRef.current.get(url);
    return cached?.sound || null;
  }, []);

  // 釋放音訊（播放完畢後可選擇釋放）
  const releaseSound = useCallback((url: string) => {
    const cached = cacheRef.current.get(url);
    if (cached) {
      try {
        cached.sound.unloadAsync();
      } catch (e) {
        // 忽略錯誤
      }
      cacheRef.current.delete(url);
    }
  }, []);

  // App 啟動時預載最近的語音訊息
  useEffect(() => {
    if (!user) {
      clearCache();
      return;
    }

    const preloadRecentVoices = async () => {
      try {
        console.log('[VoicePreload] Starting background preload...');

        // 並行取得收件匣和發送紀錄
        const [inboxMessages, sentMessages] = await Promise.all([
          messagesApi.getAll().catch(() => []),
          messagesApi.getSent().catch(() => []),
        ]);

        // 過濾出有語音的訊息
        const inboxVoices = (inboxMessages || [])
          .filter((m: any) => m.voiceUrl)
          .slice(0, MAX_PRELOAD_INBOX);

        const sentVoices = (sentMessages || [])
          .filter((m: any) => m.voiceUrl)
          .slice(0, MAX_PRELOAD_SENT);

        // 背景預載（不等待完成）
        const voiceUrls = [
          ...inboxVoices.map((m: any) => m.voiceUrl),
          ...sentVoices.map((m: any) => m.voiceUrl),
        ];

        console.log(`[VoicePreload] Found ${voiceUrls.length} voices to preload`);

        // 依序預載（避免同時載入太多）
        for (const url of voiceUrls) {
          if (url) {
            await preloadAudio(url);
          }
        }

        console.log('[VoicePreload] Background preload complete');
      } catch (err) {
        console.warn('[VoicePreload] Background preload error:', err);
      }
    };

    // 延遲執行，讓 App 先完成初始化
    const timer = setTimeout(preloadRecentVoices, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [user, preloadAudio, clearCache]);

  // 元件卸載時清理
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return (
    <VoicePreloadContext.Provider value={{ getPreloadedSound, preloadAudio, releaseSound }}>
      {children}
    </VoicePreloadContext.Provider>
  );
}

export function useVoicePreload() {
  const context = useContext(VoicePreloadContext);
  if (!context) {
    throw new Error('useVoicePreload must be used within VoicePreloadProvider');
  }
  return context;
}
