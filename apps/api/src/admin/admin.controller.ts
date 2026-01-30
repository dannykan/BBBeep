import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AIPromptService } from '../ai/ai-prompt.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivitiesService } from '../activities/activities.service';
import {
  UserType,
  VehicleType,
  InviteStatus,
  NotificationType,
  ActivityType,
} from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Admin')
@Controller('admin')
@Public() // 所有 Admin 端点都使用自己的 token 验证，不需要 JWT
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly aiPromptService: AIPromptService,
    private readonly notificationsService: NotificationsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin 登入' })
  async login(@Body() body: { password: string }) {
    return this.adminService.login(body.password);
  }

  @Get('users')
  @ApiOperation({ summary: '獲取所有用戶（按類型分類）' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAllUsers(
    @Headers('x-admin-token') token: string,
    @Query('userType') userType?: UserType,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getAllUsers(userType, search, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('users/:id')
  @ApiOperation({ summary: '獲取用戶詳情' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getUserById(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: '更新用戶資訊' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateUser(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.updateUser(id, data);
  }

  @Get('users/:id/messages')
  @ApiOperation({ summary: '獲取用戶收件夾或發送記錄' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getUserMessages(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Query('type') type: 'received' | 'sent' = 'received',
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getUserMessages(id, type);
  }

  @Put('messages/:id')
  @ApiOperation({ summary: '編輯消息' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateMessage(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.updateMessage(id, data);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: '刪除消息' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async deleteMessage(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.deleteMessage(id);
  }

  @Post('license-plates')
  @ApiOperation({ summary: '新增未綁定車牌' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async createLicensePlate(@Headers('x-admin-token') token: string, @Body() data: any) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.createUnboundLicensePlate(data);
  }

  @Put('users/:id/license-plate')
  @ApiOperation({ summary: '編輯用戶車牌' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateLicensePlate(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() data: { licensePlate: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.updateLicensePlate(id, data.licensePlate);
  }

  @Get('license-plate-applications')
  @ApiOperation({ summary: '獲取所有車牌申請' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAllApplications(
    @Headers('x-admin-token') token: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getAllLicensePlateApplications(status);
  }

  @Put('license-plate-applications/:id/review')
  @ApiOperation({ summary: '審核車牌申請' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async reviewApplication(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() data: { decision: 'approved' | 'rejected'; adminNote?: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.reviewApplication(id, data.decision, data.adminNote);
  }

  @Get('message-reports')
  @ApiOperation({ summary: '獲取所有檢舉訊息' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAllMessageReports(
    @Headers('x-admin-token') token: string,
    @Query('status') status?: 'pending' | 'reviewed' | 'resolved',
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getAllMessageReports(status);
  }

  @Put('message-reports/:id/review')
  @ApiOperation({ summary: '審核檢舉訊息' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async reviewMessageReport(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() data: { decision: 'reviewed' | 'resolved'; adminNote?: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.reviewMessageReport(id, data.decision, data.adminNote);
  }

  @Get('ai-prompts')
  @ApiOperation({ summary: '獲取所有 AI Prompt' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAIPrompts(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.aiPromptService.getAllPrompts();
  }

  @Put('ai-prompts')
  @ApiOperation({ summary: '更新 AI Prompt' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateAIPrompt(
    @Headers('x-admin-token') token: string,
    @Body() dto: { vehicleType: VehicleType; category: string; prompt: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.aiPromptService.updatePrompt(dto.vehicleType, dto.category, dto.prompt);
  }

  // ========== 用戶封鎖管理 ==========

  @Get('blocked-users')
  @ApiOperation({ summary: '獲取所有被封鎖的用戶' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getBlockedUsers(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getBlockedUsers();
  }

  @Put('users/:id/block')
  @ApiOperation({ summary: '封鎖用戶' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async blockUser(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() data: { reason?: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.blockUser(id, data.reason);
  }

  @Put('users/:id/unblock')
  @ApiOperation({ summary: '解除封鎖用戶' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async unblockUser(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.unblockUser(id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '刪除用戶（讓用戶可以重新註冊）' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async deleteUser(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.deleteUser(id);
  }

  // ========== 邀請碼管理 ==========

  @Get('invite-settings')
  @ApiOperation({ summary: '取得全域邀請設定' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getInviteSettings(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getInviteSettings();
  }

  @Put('invite-settings')
  @ApiOperation({ summary: '更新全域邀請設定' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateInviteSettings(
    @Headers('x-admin-token') token: string,
    @Body()
    data: {
      defaultInviterReward?: number;
      defaultInviteeReward?: number;
      isEnabled?: boolean;
    },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.updateInviteSettings(data);
  }

  @Get('invite-statistics')
  @ApiOperation({ summary: '取得邀請統計' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getInviteStatistics(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getInviteStatistics();
  }

  @Get('invite-history')
  @ApiOperation({ summary: '取得所有邀請記錄' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAllInviteHistory(
    @Headers('x-admin-token') token: string,
    @Query('status') status?: InviteStatus,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getAllInviteHistory(status);
  }

  @Put('users/:id/invite')
  @ApiOperation({ summary: '更新用戶的邀請碼/獎勵設定' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateUserInviteSettings(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body()
    data: {
      inviteCode?: string;
      customInviterReward?: number | null;
      customInviteeReward?: number | null;
    },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.updateUserInviteSettings(id, data);
  }

  @Post('users/:id/invite/generate')
  @ApiOperation({ summary: '為用戶生成新的邀請碼' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async generateUserInviteCode(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.generateUserInviteCode(id);
  }

  @Get('users/:id/invite-stats')
  @ApiOperation({ summary: '取得用戶的邀請統計' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getUserInviteStats(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getUserInviteStats(id);
  }

  // ========== 推播通知管理 ==========

  @Post('notifications/broadcast')
  @ApiOperation({ summary: '發送推播通知給全體用戶' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async sendBroadcastNotification(
    @Headers('x-admin-token') token: string,
    @Body() data: { title: string; body: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.notificationsService.sendBroadcast(data.title, data.body, 'admin');
  }

  @Post('notifications/send')
  @ApiOperation({ summary: '發送推播通知給指定用戶' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async sendNotificationToUsers(
    @Headers('x-admin-token') token: string,
    @Body() data: { userIds: string[]; title: string; body: string },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.notificationsService.sendToUsers(data.userIds, data.title, data.body, 'admin');
  }

  @Get('notifications/logs')
  @ApiOperation({ summary: '取得推播通知記錄' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getNotificationLogs(
    @Headers('x-admin-token') token: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.notificationsService.getNotificationLogs({
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('notifications/stats')
  @ApiOperation({ summary: '取得推播通知統計' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getNotificationStats(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getNotificationStats();
  }

  // ============ 用戶活動追蹤 ============

  @Get('activities')
  @ApiOperation({ summary: '取得所有用戶活動記錄（分頁、搜尋）' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAllActivities(
    @Headers('x-admin-token') token: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: ActivityType,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.activitiesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      type,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('activities/recent')
  @ApiOperation({ summary: '取得即時最新活動' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getRecentActivities(
    @Headers('x-admin-token') token: string,
    @Query('limit') limit?: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.activitiesService.getRecentActivities(limit ? parseInt(limit) : 50);
  }

  @Get('activities/stats')
  @ApiOperation({ summary: '取得活動統計資料' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getActivityStats(
    @Headers('x-admin-token') token: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.activitiesService.getStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('users/:id/activities')
  @ApiOperation({ summary: '取得特定用戶的活動記錄' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getUserActivities(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.activitiesService.findByUser(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  // ========== 應用程式內容管理 ==========

  @Get('app-content')
  @ApiOperation({ summary: '取得應用程式內容（Landing Page、首頁標題等）' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async getAppContent(@Headers('x-admin-token') token: string) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getAppContent();
  }

  @Put('app-content')
  @ApiOperation({ summary: '更新應用程式內容' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async updateAppContent(
    @Headers('x-admin-token') token: string,
    @Body()
    data: {
      landingTagline?: string;
      landingSubtext?: string;
      homeHeroTitle?: string;
      homeHeroSubtitle?: string;
    },
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.updateAppContent(data);
  }
}
