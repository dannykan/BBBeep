/**
 * Notifications API Service
 */

import { getApiClient } from '../client';

export type DevicePlatform = 'ios' | 'android';

export interface RegisterDeviceRequest {
  token: string;
  platform: DevicePlatform;
}

export const notificationsApi = {
  /**
   * 註冊裝置推播 Token
   */
  registerDevice: (data: RegisterDeviceRequest) =>
    getApiClient()
      .post('/notifications/device', data)
      .then((res) => res.data),

  /**
   * 移除裝置推播 Token
   */
  unregisterDevice: (token: string) =>
    getApiClient()
      .delete('/notifications/device', { data: { token } })
      .then((res) => res.data),
};
