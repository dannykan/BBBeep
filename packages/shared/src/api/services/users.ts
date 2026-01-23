/**
 * Users API Service
 */

import { getApiClient } from '../client';
import type { User, UserType, VehicleType, BlockedUser, RejectedUser, TrialStatusResponse } from '../../types';

export const usersApi = {
  getMe: () =>
    getApiClient()
      .get<User>('/users/me')
      .then((res) => res.data),

  updateMe: (data: Partial<User>) =>
    getApiClient()
      .put<User>('/users/me', data)
      .then((res) => res.data),

  completeOnboarding: (data: {
    userType: UserType;
    vehicleType?: VehicleType;
    licensePlate?: string;
    nickname?: string;
  }) =>
    getApiClient()
      .put<User>('/users/me/onboarding', data)
      .then((res) => res.data),

  findByLicensePlate: (plate: string) =>
    getApiClient()
      .get(`/users/license-plate/${plate}`)
      .then((res) => res.data),

  blockUser: (userId: string) =>
    getApiClient()
      .post('/users/block', { userId })
      .then((res) => res.data),

  unblockUser: (userId: string) =>
    getApiClient()
      .delete(`/users/block/${userId}`)
      .then((res) => res.data),

  rejectUser: (userId: string) =>
    getApiClient()
      .post('/users/reject', { userId })
      .then((res) => res.data),

  unrejectUser: (userId: string) =>
    getApiClient()
      .delete(`/users/reject/${userId}`)
      .then((res) => res.data),

  getBlockedList: () =>
    getApiClient()
      .get<BlockedUser[]>('/users/blocked')
      .then((res) => res.data),

  getRejectedList: () =>
    getApiClient()
      .get<RejectedUser[]>('/users/rejected')
      .then((res) => res.data),

  getTrialStatus: () =>
    getApiClient()
      .get<TrialStatusResponse>('/users/me/trial-status')
      .then((res) => res.data),
};
