import api from './api';
import type {
  User,
  Message,
  SentMessage,
  PointHistory,
  LoginResponse,
  MessageType,
} from '@/types';

// Auth
export const authApi = {
  checkPhone: (phone: string) =>
    api.get<{ exists: boolean; hasPassword: boolean }>(`/auth/check-phone/${phone}`).then((res) => res.data),
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
  }) => api.post<Message>('/messages', data).then((res) => res.data),
  getAll: (unreadOnly?: boolean) =>
    api.get<Message[]>('/messages', { params: { unreadOnly } }).then((res) => res.data),
  getSent: () => api.get<SentMessage[]>('/messages/sent').then((res) => res.data),
  getOne: (id: string) =>
    api.get<Message>(`/messages/${id}`).then((res) => res.data),
  markAsRead: (id: string) =>
    api.post(`/messages/${id}/read`).then((res) => res.data),
  reply: (id: string, replyText: string) =>
    api.post(`/messages/${id}/reply`, { replyText }).then((res) => res.data),
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
  rewrite: (text: string) =>
    api.post<{ rewritten: string }>('/ai/rewrite', { text }).then((res) => res.data),
};

// License Plate
export const licensePlateApi = {
  checkAvailability: (plate: string) =>
    api.get<{ available: boolean; isBound: boolean; boundPhone?: string; boundNickname?: string; hasPendingApplication?: boolean }>(
      `/users/check-license-plate/${plate}`
    ).then((res) => res.data),
  createApplication: (data: { licensePlate: string; vehicleType?: 'car' | 'scooter'; licenseImage?: string }) =>
    api.post('/users/license-plate-application', data).then((res) => res.data),
  getMyApplications: () =>
    api.get('/users/license-plate-application').then((res) => res.data),
  getApplication: (id: string) =>
    api.get(`/users/license-plate-application/${id}`).then((res) => res.data),
};
