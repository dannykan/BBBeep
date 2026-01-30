/**
 * 詞庫同步 Hook
 * 在 App 啟動時自動同步詞庫，並快取到本地
 */

import { useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profanityApi, ProfanityDictionary } from '@bbbeeep/shared';

const STORAGE_KEY = '@profanity_dictionary';
const VERSION_KEY = '@profanity_version';

// 全域快取，供 content-filter 使用
let cachedDictionary: ProfanityDictionary | null = null;

/**
 * 取得快取的詞庫（供 content-filter 使用）
 */
export function getCachedDictionary(): ProfanityDictionary | null {
  return cachedDictionary;
}

/**
 * 檢查文字是否包含不當詞彙（使用同步的詞庫）
 */
export function checkProfanity(text: string): {
  hasIssue: boolean;
  category: string | null;
  severity: string | null;
  matchedWord: string | null;
} {
  if (!cachedDictionary) {
    // 詞庫未載入，返回無問題（fallback 到 local filter）
    return { hasIssue: false, category: null, severity: null, matchedWord: null };
  }

  const lowerText = text.toLowerCase();
  const { words } = cachedDictionary;

  // 檢查高嚴重度
  for (const word of words.HIGH_SEVERITY) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'HIGH_SEVERITY', severity: 'HIGH', matchedWord: word };
    }
  }

  // 檢查威脅性言語
  for (const word of words.THREAT) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'THREAT', severity: 'HIGH', matchedWord: word };
    }
  }

  // 檢查中嚴重度
  for (const word of words.MEDIUM_SEVERITY) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'PROFANITY', severity: 'MEDIUM', matchedWord: word };
    }
  }

  // 檢查一般髒話
  for (const word of words.PROFANITY) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'PROFANITY', severity: 'LOW', matchedWord: word };
    }
  }

  // 檢查歧視
  for (const word of words.DISCRIMINATION) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'DISCRIMINATION', severity: 'MEDIUM', matchedWord: word };
    }
  }

  // 檢查騷擾
  for (const word of words.HARASSMENT) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'HARASSMENT', severity: 'LOW', matchedWord: word };
    }
  }

  return { hasIssue: false, category: null, severity: null, matchedWord: null };
}

/**
 * 詞庫同步 Hook
 */
export function useProfanitySync() {
  const isSyncingRef = useRef(false);

  const loadFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        cachedDictionary = JSON.parse(stored);
        console.log('[Profanity] Loaded from cache, version:', cachedDictionary?.version);
      }
    } catch (error) {
      console.error('[Profanity] Failed to load from storage:', error);
    }
  }, []);

  const syncDictionary = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      // 先從本地載入
      await loadFromStorage();

      // 檢查遠端版本
      const remoteVersion = await profanityApi.getVersion();
      const localVersion = await AsyncStorage.getItem(VERSION_KEY);
      const localVersionNum = localVersion ? parseInt(localVersion, 10) : 0;

      console.log('[Profanity] Local version:', localVersionNum, 'Remote version:', remoteVersion.version);

      // 如果遠端版本較新，下載新詞庫
      if (remoteVersion.version > localVersionNum) {
        console.log('[Profanity] Downloading new dictionary...');
        const dictionary = await profanityApi.getDictionary();

        // 儲存到本地
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dictionary));
        await AsyncStorage.setItem(VERSION_KEY, String(dictionary.version));

        // 更新快取
        cachedDictionary = dictionary;

        console.log('[Profanity] Dictionary updated, version:', dictionary.version, 'words:', dictionary.totalCount);
      } else {
        console.log('[Profanity] Dictionary is up to date');
      }
    } catch (error) {
      console.error('[Profanity] Sync failed:', error);
      // 同步失敗時，確保至少有本地快取
      if (!cachedDictionary) {
        await loadFromStorage();
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [loadFromStorage]);

  // App 啟動時同步
  useEffect(() => {
    syncDictionary();
  }, [syncDictionary]);

  return {
    syncDictionary,
    getCachedDictionary: () => cachedDictionary,
    checkProfanity,
  };
}
