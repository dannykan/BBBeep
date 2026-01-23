/**
 * Invite API Service
 */

import { getApiClient } from '../client';
import type {
  InviteCodeResponse,
  ValidateCodeResponse,
  ApplyInviteCodeResponse,
  InviteHistoryItem,
} from '../../types';

export const inviteApi = {
  getMyCode: () =>
    getApiClient()
      .get<InviteCodeResponse>('/invite/my-code')
      .then((res) => res.data),

  validateCode: (code: string) =>
    getApiClient()
      .get<ValidateCodeResponse>(`/invite/validate/${code}`)
      .then((res) => res.data),

  applyCode: (code: string) =>
    getApiClient()
      .post<ApplyInviteCodeResponse>('/invite/apply', { code })
      .then((res) => res.data),

  getHistory: () =>
    getApiClient()
      .get<InviteHistoryItem[]>('/invite/history')
      .then((res) => res.data),
};
