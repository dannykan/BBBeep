import { getApiClient } from '../client';

export interface ProfanityDictionary {
  version: number;
  words: {
    PROFANITY: string[];
    THREAT: string[];
    HARASSMENT: string[];
    DISCRIMINATION: string[];
    HIGH_SEVERITY: string[];
    MEDIUM_SEVERITY: string[];
  };
  totalCount: number;
}

export interface ProfanityVersion {
  version: number;
}

export const profanityApi = {
  /**
   * 取得詞庫版本
   */
  getVersion: (): Promise<ProfanityVersion> =>
    getApiClient()
      .get<ProfanityVersion>('/profanity/version')
      .then((res) => res.data),

  /**
   * 取得完整詞庫
   */
  getDictionary: (): Promise<ProfanityDictionary> =>
    getApiClient()
      .get<ProfanityDictionary>('/profanity/dictionary')
      .then((res) => res.data),
};
