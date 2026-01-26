/**
 * Activities API Service
 * 用戶活動追蹤
 */

import { getApiClient } from '../client';

export type ActivityType =
  | 'RECORDING_COMPLETE'
  | 'TEXT_EDIT'
  | 'AI_OPTIMIZE'
  | 'MESSAGE_SENT'
  | 'RECORDING_CANCEL';

export interface CreateActivityData {
  type: ActivityType;
  messageText?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  transcript?: string;
  aiModerationResult?: {
    isAppropriate: boolean;
    reason?: string;
    category?: string;
  };
  targetPlate?: string;
  vehicleType?: string;
  category?: string;
  sendMode?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  metadata?: any;
  isSent?: boolean;
  messageId?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  messageText?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  transcript?: string;
  aiModerationResult?: any;
  targetPlate?: string;
  vehicleType?: string;
  category?: string;
  sendMode?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  metadata?: any;
  isSent: boolean;
  messageId?: string;
  createdAt: string;
}

export const activitiesApi = {
  /**
   * 記錄活動
   */
  create: (data: CreateActivityData) => {
    return getApiClient()
      .post<UserActivity>('/activities', data)
      .then((res) => res.data);
  },

  /**
   * 記錄錄音完成
   */
  recordRecording: (data: {
    voiceUrl: string;
    voiceDuration: number;
    transcript?: string;
    targetPlate?: string;
    vehicleType?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    location?: string;
  }) => {
    return getApiClient()
      .post<UserActivity>('/activities/recording', data)
      .then((res) => res.data);
  },

  /**
   * 記錄文字編輯（點擊下一步）
   */
  recordTextEdit: (data: {
    messageText: string;
    targetPlate?: string;
    vehicleType?: string;
    category?: string;
    sendMode?: string;
    aiModerationResult?: any;
  }) => {
    return getApiClient()
      .post<UserActivity>('/activities/text-edit', data)
      .then((res) => res.data);
  },

  /**
   * 記錄 AI 優化
   */
  recordAiOptimize: (data: {
    messageText: string;
    voiceUrl?: string;
    voiceDuration?: number;
    transcript?: string;
    targetPlate?: string;
    vehicleType?: string;
    category?: string;
  }) => {
    return getApiClient()
      .post<UserActivity>('/activities/ai-optimize', data)
      .then((res) => res.data);
  },

  /**
   * 記錄訊息發送成功
   */
  recordSent: (data: {
    messageText: string;
    voiceUrl?: string;
    voiceDuration?: number;
    transcript?: string;
    targetPlate: string;
    vehicleType: string;
    category: string;
    sendMode: string;
    messageId: string;
    latitude?: number;
    longitude?: number;
    location?: string;
  }) => {
    return getApiClient()
      .post<UserActivity>('/activities/sent', data)
      .then((res) => res.data);
  },

  /**
   * 取得我的活動記錄
   */
  getMyActivities: (options?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    return getApiClient()
      .get<{
        activities: UserActivity[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/activities/my?${params.toString()}`)
      .then((res) => res.data);
  },
};
