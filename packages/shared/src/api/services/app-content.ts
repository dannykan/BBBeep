/**
 * App Content API Service
 * 應用程式內容（Landing Page、首頁標題等）
 */

import { getApiClient } from '../client';

export interface AppContentResponse {
  id: string;
  landingTagline: string;
  landingSubtext: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  updatedAt: string;
}

export const appContentApi = {
  getContent: () =>
    getApiClient()
      .get<AppContentResponse>('/app-content')
      .then((res) => res.data),
};
