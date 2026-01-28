/**
 * Drafts API Service
 * 語音草稿功能 API
 */

import { getApiClient } from '../client';

// ============ Types ============

export type DraftStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'SENT'
  | 'EXPIRED'
  | 'DELETED';

export interface ParsedPlate {
  plate: string;
  confidence: number;
}

export interface ParsedVehicle {
  type: 'car' | 'scooter' | 'unknown';
  color?: string;
  brand?: string;
  model?: string;
}

export interface ParsedEvent {
  category: 'VEHICLE_REMINDER' | 'SAFETY_REMINDER' | 'PRAISE' | 'OTHER';
  type: string;
  description: string;
  location?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface VoiceDraft {
  id: string;
  voiceUrl: string;
  voiceDuration: number;
  transcript?: string;
  parsedPlates: ParsedPlate[];
  parsedVehicle?: ParsedVehicle;
  parsedEvent?: ParsedEvent;
  suggestedMessage?: string;
  // 用戶輸入資料
  selectedPlate?: string;
  vehicleType?: string;
  occurredAt?: string;
  // 位置
  latitude?: number;
  longitude?: number;
  address?: string;
  status: DraftStatus;
  createdAt: string;
  expiresAt: string;
}

export interface CreateDraftRequest {
  voiceUrl: string;
  voiceDuration: number;
  transcript?: string;
  // 用戶輸入資料
  selectedPlate?: string;
  vehicleType?: string;
  occurredAt?: string;
  // 位置
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface UpdateDraftRequest {
  selectedPlate?: string;
  vehicleType?: string;
}

export interface SendFromDraftRequest {
  selectedPlate: string;
  vehicleType: 'car' | 'scooter';
  category: string;
  situation?: string;
  customText?: string;
  useAiSuggestion: boolean;
  sendMode: 'text' | 'voice' | 'ai';
}

export interface DraftListResponse {
  drafts: VoiceDraft[];
  count: number;
}

export interface SendFromDraftResponse {
  success: boolean;
  messageId: string;
  pointsUsed: number;
  remainingPoints: number;
}

export interface TestParseResponse {
  plates: ParsedPlate[];
  vehicle: ParsedVehicle;
  event: ParsedEvent;
  suggestedMessage: string;
}

// ============ API ============

export const draftsApi = {
  /**
   * 建立語音草稿
   */
  create: (data: CreateDraftRequest) => {
    return getApiClient()
      .post<VoiceDraft>('/drafts', data)
      .then((res) => res.data);
  },

  /**
   * 取得所有草稿
   */
  getAll: () => {
    return getApiClient()
      .get<DraftListResponse>('/drafts')
      .then((res) => res.data);
  },

  /**
   * 取得待處理草稿數量
   */
  getCount: () => {
    return getApiClient()
      .get<{ count: number }>('/drafts/count')
      .then((res) => res.data);
  },

  /**
   * 取得單一草稿
   */
  getOne: (id: string) => {
    return getApiClient()
      .get<VoiceDraft>(`/drafts/${id}`)
      .then((res) => res.data);
  },

  /**
   * 更新草稿
   */
  update: (id: string, data: UpdateDraftRequest) => {
    return getApiClient()
      .patch<VoiceDraft>(`/drafts/${id}`, data)
      .then((res) => res.data);
  },

  /**
   * 刪除草稿
   */
  delete: (id: string) => {
    return getApiClient()
      .delete(`/drafts/${id}`)
      .then((res) => res.data);
  },

  /**
   * 標記草稿為已發送
   */
  markAsSent: (id: string) => {
    return getApiClient()
      .post(`/drafts/${id}/sent`)
      .then((res) => res.data);
  },

  /**
   * 測試語音解析（開發用）
   */
  testParse: (transcript: string) => {
    return getApiClient()
      .post<TestParseResponse>('/drafts/test/parse', { transcript })
      .then((res) => res.data);
  },
};
