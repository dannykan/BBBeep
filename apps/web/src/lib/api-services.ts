import api from './api';
import type {
  User,
  Message,
  SentMessage,
  PointHistory,
  LoginResponse,
  MessageType,
  InviteCodeResponse,
  ValidateCodeResponse,
  ApplyInviteCodeResponse,
  InviteHistoryItem,
  InviteSettings,
  InviteStatistics,
  AdminInviteHistoryItem,
  UserInviteStats,
  InviteStatus,
} from '@/types';

// Auth
export const authApi = {
  checkPhone: (phone: string) =>
    api.get<{ exists: boolean; hasPassword: boolean }>(`/auth/check-phone/${encodeURIComponent(phone)}`).then((res) => res.data),
  verifyPhone: (phone: string) =>
    api.post<{ message: string; code?: string; remaining?: number }>('/auth/verify-phone', { phone }).then((res) => res.data),
  login: (phone: string, code: string) =>
    api.post<LoginResponse>('/auth/login', { phone, code }).then((res) => res.data),
  passwordLogin: (phone: string, password: string) =>
    api.post<LoginResponse>('/auth/password-login', { phone, password }).then((res) => res.data),
  setPassword: (phone: string, code: string, password: string) =>
    api.post<{ message: string; access_token?: string; user?: any }>('/auth/set-password', { phone, code, password }).then((res) => res.data),
  resetPassword: (phone: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { phone, code, newPassword }).then((res) => res.data),
  resetVerifyCount: (phone: string) =>
    api.post('/auth/reset-verify-count', { phone }).then((res) => res.data),
  // LINE Login
  lineLogin: (code: string, state: string) =>
    api.post<LoginResponse>('/auth/line/login', { code, state }).then((res) => res.data),
};

// Users
export const usersApi = {
  getMe: () => api.get<User>('/users/me').then((res) => res.data),
  updateMe: (data: Partial<User>) =>
    api.put<User>('/users/me', data).then((res) => res.data),
  completeOnboarding: (data: {
    userType: 'driver' | 'pedestrian';
    vehicleType?: 'car' | 'scooter';
    licensePlate?: string;
    nickname?: string;
  }) =>
    api.put<User>('/users/me/onboarding', data).then((res) => res.data),
  findByLicensePlate: (plate: string) =>
    api.get(`/users/license-plate/${plate}`).then((res) => res.data),
  blockUser: (userId: string) =>
    api.post('/users/block', { userId }).then((res) => res.data),
  unblockUser: (userId: string) =>
    api.delete(`/users/block/${userId}`).then((res) => res.data),
  rejectUser: (userId: string) =>
    api.post('/users/reject', { userId }).then((res) => res.data),
  unrejectUser: (userId: string) =>
    api.delete(`/users/reject/${userId}`).then((res) => res.data),
  getBlockedList: () =>
    api.get('/users/blocked').then((res) => res.data),
  getRejectedList: () =>
    api.get('/users/rejected').then((res) => res.data),
};

// Messages
export const messagesApi = {
  create: (data: {
    licensePlate: string;
    type: MessageType;
    template: string;
    customText?: string;
    useAiRewrite?: boolean;
    location?: string;
    occurredAt?: string;
  }) => api.post<Message>('/messages', data).then((res) => res.data),
  getAll: (unreadOnly?: boolean) =>
    api.get<Message[]>('/messages', { params: { unreadOnly } }).then((res) => res.data),
  getSent: () => api.get<SentMessage[]>('/messages/sent').then((res) => res.data),
  getOne: (id: string) =>
    api.get<Message>(`/messages/${id}`).then((res) => res.data),
  markAsRead: (id: string) =>
    api.post(`/messages/${id}/read`).then((res) => res.data),
  reply: (id: string, replyText: string, options?: { isQuickReply?: boolean; useAiRewrite?: boolean }) =>
    api.post(`/messages/${id}/reply`, { replyText, ...options }).then((res) => res.data),
  report: (id: string, reason?: string) =>
    api.post(`/messages/${id}/report`, { reason }).then((res) => res.data),
};

// Points
export const pointsApi = {
  getBalance: () =>
    api.get<{ points: number }>('/points/balance').then((res) => res.data),
  getHistory: () =>
    api.get<PointHistory[]>('/points/history').then((res) => res.data),
  recharge: (amount: number) =>
    api.post('/points/recharge', { amount }).then((res) => res.data),
};

// AI
export const aiApi = {
  checkLimit: () =>
    api.get<{ canUse: boolean; remaining: number }>('/ai/rewrite/limit').then((res) => res.data),
  resetLimit: () =>
    api.post<{ canUse: boolean; remaining: number }>('/ai/rewrite/reset').then((res) => res.data),
  rewrite: (text: string, vehicleType?: 'car' | 'scooter', category?: string) =>
    api.post<{ rewritten: string }>('/ai/rewrite', { text, vehicleType, category }).then((res) => res.data),
};

// Upload
export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; filename: string; originalname: string; size: number }>(
      '/upload/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    ).then((res) => res.data);
  },
};

// License Plate
export const licensePlateApi = {
  checkAvailability: (plate: string) =>
    api.get<{ available: boolean; isBound: boolean; boundPhone?: string; boundNickname?: string; hasPendingApplication?: boolean }>(
      `/users/check-license-plate/${plate}`
    ).then((res) => res.data),
  createApplication: (data: { licensePlate: string; vehicleType?: 'car' | 'scooter'; licenseImage?: string; email?: string }) =>
    api.post('/users/license-plate-application', data).then((res) => res.data),
  getMyApplications: () =>
    api.get('/users/license-plate-application').then((res) => res.data),
  getApplication: (id: string) =>
    api.get(`/users/license-plate-application/${id}`).then((res) => res.data),
};

// Invite
export const inviteApi = {
  getMyCode: () =>
    api.get<InviteCodeResponse>('/invite/my-code').then((res) => res.data),
  validateCode: (code: string) =>
    api.get<ValidateCodeResponse>(`/invite/validate/${code}`).then((res) => res.data),
  applyCode: (code: string) =>
    api.post<ApplyInviteCodeResponse>('/invite/apply', { code }).then((res) => res.data),
  getHistory: () =>
    api.get<InviteHistoryItem[]>('/invite/history').then((res) => res.data),
};

// Admin Invite
export const adminInviteApi = {
  getSettings: (token: string) =>
    api.get<InviteSettings>('/admin/invite-settings', {
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
  updateSettings: (token: string, data: Partial<Pick<InviteSettings, 'defaultInviterReward' | 'defaultInviteeReward' | 'isEnabled'>>) =>
    api.put<InviteSettings>('/admin/invite-settings', data, {
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
  getStatistics: (token: string) =>
    api.get<InviteStatistics>('/admin/invite-statistics', {
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
  getHistory: (token: string, status?: InviteStatus) =>
    api.get<AdminInviteHistoryItem[]>('/admin/invite-history', {
      params: { status },
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
  updateUserInviteSettings: (token: string, userId: string, data: {
    inviteCode?: string;
    customInviterReward?: number | null;
    customInviteeReward?: number | null;
  }) =>
    api.put(`/admin/users/${userId}/invite`, data, {
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
  generateUserInviteCode: (token: string, userId: string) =>
    api.post(`/admin/users/${userId}/invite/generate`, {}, {
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
  getUserInviteStats: (token: string, userId: string) =>
    api.get<UserInviteStats>(`/admin/users/${userId}/invite-stats`, {
      headers: { 'x-admin-token': token }
    }).then((res) => res.data),
};
