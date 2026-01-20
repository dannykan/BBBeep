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
import { UserType } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Admin')
@Controller('admin')
@Public() // 所有 Admin 端点都使用自己的 token 验证，不需要 JWT
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.adminService.getAllUsers(userType);
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
  async createLicensePlate(
    @Headers('x-admin-token') token: string,
    @Body() data: any,
  ) {
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
}
