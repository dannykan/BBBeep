/**
 * AI API Service
 */

import { getApiClient } from '../client';
import type { VehicleType, AiLimitResponse, AiRewriteResponse } from '../../types';

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
};
