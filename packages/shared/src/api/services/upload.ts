/**
 * Upload API Service
 */

import { getApiClient } from '../client';
import type { UploadResponse, VoiceUploadResponse } from '../../types';

/**
 * 上傳檔案資料型別
 * Web: File
 * React Native: { uri: string; name: string; type: string }
 */
export type UploadFile = File | { uri: string; name: string; type: string };

export const uploadApi = {
  /**
   * 上傳圖片
   * @param file - Web 使用 File，React Native 使用 { uri, name, type }
   */
  uploadImage: (file: UploadFile) => {
    const formData = new FormData();

    // 處理不同平台的檔案格式
    if (file instanceof File) {
      // Web
      formData.append('file', file);
    } else {
      // React Native
      formData.append('file', file as unknown as Blob);
    }

    return getApiClient()
      .post<UploadResponse>('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((res) => res.data);
  },

  /**
   * 上傳語音檔案
   * @param uri - React Native 的檔案 URI
   * @param filename - 可選的檔案名稱
   */
  uploadVoice: (uri: string, filename?: string) => {
    const formData = new FormData();

    // React Native 格式
    const file = {
      uri,
      name: filename || `voice_${Date.now()}.m4a`,
      type: 'audio/m4a',
    };

    formData.append('file', file as unknown as Blob);

    return getApiClient()
      .post<VoiceUploadResponse>('/upload/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for voice upload
      })
      .then((res) => res.data);
  },

  /**
   * 語音轉文字（使用 OpenAI Whisper）
   * @param uri - React Native 的語音檔案 URI
   * @param filename - 可選的檔案名稱
   */
  transcribeVoice: (uri: string, filename?: string) => {
    const formData = new FormData();

    // React Native 格式
    const file = {
      uri,
      name: filename || `voice_${Date.now()}.m4a`,
      type: 'audio/m4a',
    };

    formData.append('file', file as unknown as Blob);

    return getApiClient()
      .post<{ text: string; error?: string }>('/upload/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 120 seconds for transcription (OpenAI Whisper can be slow)
      })
      .then((res) => res.data);
  },
};
