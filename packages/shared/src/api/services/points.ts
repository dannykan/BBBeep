/**
 * Points API Service
 */

import { getApiClient } from '../client';
import type { PointHistory } from '../../types';

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
};
