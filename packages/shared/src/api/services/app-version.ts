import { getApiClient } from '../client';

export interface VersionCheckResponse {
  minVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateUrl: string | null;
  updateMessage: string | null;
  needsUpdate: boolean;
}

export const appVersionApi = {
  /**
   * 檢查 App 版本（判斷是否需要強制更新）
   */
  checkVersion: async (
    platform: 'ios' | 'android',
    version: string
  ): Promise<VersionCheckResponse> => {
    const response = await getApiClient().get<VersionCheckResponse>(
      `/app/version-check?platform=${platform}&version=${version}`
    );
    return response.data;
  },
};
