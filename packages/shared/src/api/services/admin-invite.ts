/**
 * Admin Invite API Service
 */

import { getApiClient } from '../client';
import type {
  InviteSettings,
  InviteStatistics,
  AdminInviteHistoryItem,
  UserInviteStats,
  InviteStatus,
} from '../../types';

export const adminInviteApi = {
  getSettings: (token: string) =>
    getApiClient()
      .get<InviteSettings>('/admin/invite-settings', {
        headers: { 'x-admin-token': token },
      })
      .then((res) => res.data),

  updateSettings: (
    token: string,
    data: Partial<Pick<InviteSettings, 'defaultInviterReward' | 'defaultInviteeReward' | 'isEnabled'>>
  ) =>
    getApiClient()
      .put<InviteSettings>('/admin/invite-settings', data, {
        headers: { 'x-admin-token': token },
      })
      .then((res) => res.data),

  getStatistics: (token: string) =>
    getApiClient()
      .get<InviteStatistics>('/admin/invite-statistics', {
        headers: { 'x-admin-token': token },
      })
      .then((res) => res.data),

  getHistory: (token: string, status?: InviteStatus) =>
    getApiClient()
      .get<AdminInviteHistoryItem[]>('/admin/invite-history', {
        params: { status },
        headers: { 'x-admin-token': token },
      })
      .then((res) => res.data),

  updateUserInviteSettings: (
    token: string,
    userId: string,
    data: {
      inviteCode?: string;
      customInviterReward?: number | null;
      customInviteeReward?: number | null;
    }
  ) =>
    getApiClient()
      .put(`/admin/users/${userId}/invite`, data, {
        headers: { 'x-admin-token': token },
      })
      .then((res) => res.data),

  generateUserInviteCode: (token: string, userId: string) =>
    getApiClient()
      .post(
        `/admin/users/${userId}/invite/generate`,
        {},
        {
          headers: { 'x-admin-token': token },
        }
      )
      .then((res) => res.data),

  getUserInviteStats: (token: string, userId: string) =>
    getApiClient()
      .get<UserInviteStats>(`/admin/users/${userId}/invite-stats`, {
        headers: { 'x-admin-token': token },
      })
      .then((res) => res.data),
};
