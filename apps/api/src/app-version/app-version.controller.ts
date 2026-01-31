import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AppVersionService } from './app-version.service';
import { Public } from '../auth/decorators/public.decorator';
import { AdminService } from '../admin/admin.service';

@ApiTags('App Version')
@Controller('app')
export class AppVersionController {
  constructor(
    private readonly appVersionService: AppVersionService,
    private readonly adminService: AdminService,
  ) {}

  @Get('version-check')
  @Public()
  @ApiOperation({ summary: '檢查 App 版本（判斷是否需要強制更新）' })
  @ApiQuery({ name: 'platform', enum: ['ios', 'android'], required: true })
  @ApiQuery({ name: 'version', type: String, required: true })
  async checkVersion(
    @Query('platform') platform: 'ios' | 'android',
    @Query('version') version: string,
  ) {
    return this.appVersionService.checkVersion(platform, version);
  }

  // ========== Admin Endpoints ==========

  @Get('admin/version-configs')
  @Public()
  @ApiOperation({ summary: '取得所有平台的版本設定（Admin）' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAllConfigs(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.appVersionService.getAllConfigs();
  }

  @Put('admin/version-configs')
  @Public()
  @ApiOperation({ summary: '更新版本設定（Admin）' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateConfig(
    @Headers('x-admin-token') token: string,
    @Body()
    data: {
      platform: 'ios' | 'android';
      minVersion?: string;
      currentVersion?: string;
      forceUpdate?: boolean;
      updateUrl?: string;
      updateMessage?: string;
    },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    const { platform, ...updateData } = data;
    return this.appVersionService.updateConfig(platform, updateData);
  }
}
