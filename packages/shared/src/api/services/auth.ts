/**
 * Auth API Service
 */

import { getApiClient } from '../client';
import type { LoginResponse, CheckPhoneResponse, VerifyPhoneResponse } from '../../types';

export const authApi = {
  checkPhone: (phone: string) =>
    getApiClient()
      .get<CheckPhoneResponse>(`/auth/check-phone/${encodeURIComponent(phone)}`)
      .then((res) => res.data),

  verifyPhone: (phone: string) =>
    getApiClient()
      .post<VerifyPhoneResponse>('/auth/verify-phone', { phone })
      .then((res) => res.data),

  login: (phone: string, code: string) =>
    getApiClient()
      .post<LoginResponse>('/auth/login', { phone, code })
      .then((res) => res.data),

  passwordLogin: (phone: string, password: string) =>
    getApiClient()
      .post<LoginResponse>('/auth/password-login', { phone, password })
      .then((res) => res.data),

  setPassword: (phone: string, code: string, password: string) =>
    getApiClient()
      .post<{ message: string; access_token?: string; user?: unknown }>('/auth/set-password', {
        phone,
        code,
        password,
      })
      .then((res) => res.data),

  resetPassword: (phone: string, code: string, newPassword: string) =>
    getApiClient()
      .post('/auth/reset-password', { phone, code, newPassword })
      .then((res) => res.data),

  resetVerifyCount: (phone: string) =>
    getApiClient()
      .post('/auth/reset-verify-count', { phone })
      .then((res) => res.data),

  // LINE Login (Web - code exchange)
  lineLogin: (code: string, state: string, redirectUri?: string) =>
    getApiClient()
      .post<LoginResponse>('/auth/line/login', { code, state, redirectUri })
      .then((res) => res.data),

  // LINE Login (Mobile SDK - token based)
  lineTokenLogin: (accessToken: string) =>
    getApiClient()
      .post<LoginResponse>('/auth/line/token-login', { accessToken })
      .then((res) => res.data),

  // Apple Sign-In
  appleLogin: (identityToken: string, fullName?: string, email?: string) =>
    getApiClient()
      .post<LoginResponse>('/auth/apple/login', { identityToken, fullName, email })
      .then((res) => res.data),

  // 車牌 + 密碼登入
  licensePlateLogin: (licensePlate: string, password: string) =>
    getApiClient()
      .post<LoginResponse>('/auth/license-plate-login', { licensePlate, password })
      .then((res) => res.data),
};
