/**
 * Upload API Service
 */

import { getApiClient } from '../client';
import type { UploadResponse } from '../../types';

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
};
