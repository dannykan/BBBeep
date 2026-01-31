import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface VersionCheckResponse {
  minVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateUrl: string | null;
  updateMessage: string | null;
  needsUpdate: boolean;
}

@Injectable()
export class AppVersionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 檢查 App 版本（公開 API）
   */
  async checkVersion(
    platform: 'ios' | 'android',
    appVersion: string,
  ): Promise<VersionCheckResponse> {
    // 取得或建立平台設定
    let config = await this.prisma.appVersionConfig.findUnique({
      where: { platform },
    });

    // 如果沒有設定，建立預設值
    if (!config) {
      config = await this.prisma.appVersionConfig.create({
        data: {
          platform,
          minVersion: '1.0.0',
          currentVersion: '1.0.3',
          forceUpdate: false,
          updateUrl:
            platform === 'ios'
              ? 'https://apps.apple.com/app/ubeep/id6740043498'
              : 'https://play.google.com/store/apps/details?id=com.ubeep.mobile',
          updateMessage: '有新版本可用，請更新以獲得最佳體驗',
        },
      });
    }

    // 比較版本
    const needsUpdate = this.compareVersions(appVersion, config.minVersion) < 0;

    return {
      minVersion: config.minVersion,
      currentVersion: config.currentVersion,
      forceUpdate: config.forceUpdate && needsUpdate,
      updateUrl: config.updateUrl,
      updateMessage: config.updateMessage,
      needsUpdate,
    };
  }

  /**
   * 取得所有平台的版本設定（Admin）
   */
  async getAllConfigs() {
    const configs = await this.prisma.appVersionConfig.findMany({
      orderBy: { platform: 'asc' },
    });

    // 確保 iOS 和 Android 都有設定
    const platforms = ['ios', 'android'];
    for (const platform of platforms) {
      if (!configs.find((c) => c.platform === platform)) {
        const newConfig = await this.prisma.appVersionConfig.create({
          data: {
            platform,
            minVersion: '1.0.0',
            currentVersion: '1.0.3',
            forceUpdate: false,
            updateUrl:
              platform === 'ios'
                ? 'https://apps.apple.com/app/ubeep/id6740043498'
                : 'https://play.google.com/store/apps/details?id=com.ubeep.mobile',
            updateMessage: '有新版本可用，請更新以獲得最佳體驗',
          },
        });
        configs.push(newConfig);
      }
    }

    return configs.sort((a, b) => a.platform.localeCompare(b.platform));
  }

  /**
   * 更新版本設定（Admin）
   */
  async updateConfig(
    platform: 'ios' | 'android',
    data: {
      minVersion?: string;
      currentVersion?: string;
      forceUpdate?: boolean;
      updateUrl?: string;
      updateMessage?: string;
    },
  ) {
    return this.prisma.appVersionConfig.upsert({
      where: { platform },
      update: data,
      create: {
        platform,
        minVersion: data.minVersion || '1.0.0',
        currentVersion: data.currentVersion || '1.0.3',
        forceUpdate: data.forceUpdate ?? false,
        updateUrl: data.updateUrl,
        updateMessage: data.updateMessage,
      },
    });
  }

  /**
   * 比較版本號
   * 回傳: -1 (v1 < v2), 0 (v1 = v2), 1 (v1 > v2)
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((n) => parseInt(n, 10) || 0);
    const parts2 = v2.split('.').map((n) => parseInt(n, 10) || 0);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }

    return 0;
  }
}
