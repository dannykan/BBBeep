/**
 * AI API Service
 */

import { getApiClient } from '../client';
import type { VehicleType, AiLimitResponse, AiRewriteResponse } from '../../types';

export interface AiModerationResponse {
  isAppropriate: boolean;
  reason: string | null;
  category: 'ok' | 'emotional' | 'inappropriate' | 'dangerous';
  suggestion: string | null;
}

export const aiApi = {
  checkLimit: () =>
    getApiClient()
      .get<AiLimitResponse>('/ai/rewrite/limit')
      .then((res) => res.data),

  resetLimit: () =>
    getApiClient()
      .post<AiLimitResponse>('/ai/rewrite/reset')
      .then((res) => res.data),

  rewrite: (text: string, vehicleType?: VehicleType, category?: string) =>
    getApiClient()
      .post<AiRewriteResponse>('/ai/rewrite', { text, vehicleType, category })
      .then((res) => res.data),

  /**
   * AI 內容審核
   * 使用 AI 判斷內容是否適合在提醒平台發送
   */
  moderate: (text: string) =>
    getApiClient()
      .post<AiModerationResponse>('/ai/moderate', { text })
      .then((res) => res.data),
};
