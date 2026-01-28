/**
 * Points API Service
 */

import { getApiClient } from '../client';
import type { PointHistory } from '../../types';

export interface VerifyIAPRequest {
  transactionId: string;
  productId: string;
  platform: 'ios' | 'android';
  receiptData?: string;
}

export interface VerifyIAPResponse {
  success: boolean;
  pointsAwarded: number;
  newBalance: number;
  error?: string;
}

export const pointsApi = {
  getBalance: () =>
    getApiClient()
      .get<{ points: number }>('/points/balance')
      .then((res) => res.data),

  getHistory: () =>
    getApiClient()
      .get<PointHistory[]>('/points/history')
      .then((res) => res.data),

  recharge: (amount: number) =>
    getApiClient()
      .post('/points/recharge', { amount })
      .then((res) => res.data),

  /**
   * 驗證 IAP 購買並發放點數
   */
  verifyIAP: (data: VerifyIAPRequest) =>
    getApiClient()
      .post<VerifyIAPResponse>('/points/verify-iap', data)
      .then((res) => res.data),
};
