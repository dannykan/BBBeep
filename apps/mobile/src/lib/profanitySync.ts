/**
 * 詞庫同步模組
 * 在 App 啟動時自動同步詞庫
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { profanityApi, ProfanityDictionary } from '@bbbeeep/shared';

const STORAGE_KEY = '@profanity_dictionary';
const VERSION_KEY = '@profanity_version';

// 全域快取
let cachedDictionary: ProfanityDictionary | null = null;
let isInitialized = false;

/**
 * 取得快取的詞庫
 */
export function getCachedDictionary(): ProfanityDictionary | null {
  return cachedDictionary;
}

/**
 * 檢查是否已初始化
 */
export function isProfanitySyncInitialized(): boolean {
  return isInitialized;
}

/**
 * 檢查文字是否包含不當詞彙
 */
export function checkProfanityFromSync(text: string): {
  hasIssue: boolean;
  category: string | null;
  severity: string | null;
  matchedWord: string | null;
} {
  if (!cachedDictionary) {
    return { hasIssue: false, category: null, severity: null, matchedWord: null };
  }

  const lowerText = text.toLowerCase();
  const { words } = cachedDictionary;

  // 檢查高嚴重度
  for (const word of words.HIGH_SEVERITY || []) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'HIGH_SEVERITY', severity: 'HIGH', matchedWord: word };
    }
  }

  // 檢查威脅性言語
  for (const word of words.THREAT || []) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'THREAT', severity: 'HIGH', matchedWord: word };
    }
  }

  // 檢查中嚴重度
  for (const word of words.MEDIUM_SEVERITY || []) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'PROFANITY', severity: 'MEDIUM', matchedWord: word };
    }
  }

  // 檢查一般髒話
  for (const word of words.PROFANITY || []) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'PROFANITY', severity: 'LOW', matchedWord: word };
    }
  }

  // 檢查歧視
  for (const word of words.DISCRIMINATION || []) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'DISCRIMINATION', severity: 'MEDIUM', matchedWord: word };
    }
  }

  // 檢查騷擾
  for (const word of words.HARASSMENT || []) {
    if (lowerText.includes(word.toLowerCase())) {
      return { hasIssue: true, category: 'HARASSMENT', severity: 'LOW', matchedWord: word };
    }
  }

  return { hasIssue: false, category: null, severity: null, matchedWord: null };
}

/**
 * 從本地載入詞庫
 */
async function loadFromStorage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedDictionary = JSON.parse(stored);
      console.log('[ProfanitySync] Loaded from cache, version:', cachedDictionary?.version);
    }
  } catch (error) {
    console.error('[ProfanitySync] Failed to load from storage:', error);
  }
}

/**
 * 同步詞庫
 */
async function syncDictionary(): Promise<void> {
  try {
    // 先從本地載入
    await loadFromStorage();

    // 檢查遠端版本
    const remoteVersion = await profanityApi.getVersion();
    const localVersion = await AsyncStorage.getItem(VERSION_KEY);
    const localVersionNum = localVersion ? parseInt(localVersion, 10) : 0;

    console.log('[ProfanitySync] Local:', localVersionNum, 'Remote:', remoteVersion.version);

    // 如果遠端版本較新，下載新詞庫
    if (remoteVersion.version > localVersionNum) {
      console.log('[ProfanitySync] Downloading new dictionary...');
      const dictionary = await profanityApi.getDictionary();

      // 儲存到本地
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dictionary));
      await AsyncStorage.setItem(VERSION_KEY, String(dictionary.version));

      // 更新快取
      cachedDictionary = dictionary;

      console.log('[ProfanitySync] Updated to version:', dictionary.version, 'words:', dictionary.totalCount);
    } else {
      console.log('[ProfanitySync] Dictionary is up to date');
    }

    isInitialized = true;
  } catch (error) {
    console.error('[ProfanitySync] Sync failed:', error);
    // 同步失敗時，確保至少有本地快取
    if (!cachedDictionary) {
      await loadFromStorage();
    }
    isInitialized = true; // 即使失敗也標記為已初始化，使用 fallback
  }
}

/**
 * 初始化詞庫同步（在 App 啟動時呼叫）
 */
export function initProfanitySync(): void {
  // 非阻塞式同步
  syncDictionary().catch((error) => {
    console.error('[ProfanitySync] Init failed:', error);
  });
}

/**
 * 手動觸發同步
 */
export async function manualSync(): Promise<void> {
  await syncDictionary();
}
