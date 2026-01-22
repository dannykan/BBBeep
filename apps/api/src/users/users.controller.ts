import { Controller, Get, Put, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, CompleteOnboardingDto } from './dto/update-user.dto';
import { BlockUserDto, RejectUserDto } from './dto/block-user.dto';
import { CreateLicensePlateApplicationDto } from './dto/license-plate-application.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '獲取當前用戶資訊' })
  async getMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: '更新用戶資訊' })
  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.userId, dto);
  }

  @Put('me/onboarding')
  @ApiOperation({ summary: '完成註冊流程' })
  async completeOnboarding(
    @CurrentUser() user: any,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.usersService.completeOnboarding(user.userId, dto);
  }

  @Get('license-plate/:plate')
  @ApiOperation({ summary: '根據車牌查找用戶（用於發送提醒）' })
  async findByLicensePlate(@Param('plate') plate: string) {
    return this.usersService.findByLicensePlate(plate);
  }

  @Post('block')
  @ApiOperation({ summary: '封鎖用戶' })
  async blockUser(@CurrentUser() user: any, @Body() dto: BlockUserDto) {
    return this.usersService.blockUser(user.userId, dto.userId);
  }

  @Delete('block/:userId')
  @ApiOperation({ summary: '解除封鎖' })
  async unblockUser(@CurrentUser() user: any, @Param('userId') blockedId: string) {
    return this.usersService.unblockUser(user.userId, blockedId);
  }

  @Post('reject')
  @ApiOperation({ summary: '拒收用戶' })
  async rejectUser(@CurrentUser() user: any, @Body() dto: RejectUserDto) {
    return this.usersService.rejectUser(user.userId, dto.userId);
  }

  @Delete('reject/:userId')
  @ApiOperation({ summary: '移除拒收' })
  async unrejectUser(@CurrentUser() user: any, @Param('userId') rejectedId: string) {
    return this.usersService.unrejectUser(user.userId, rejectedId);
  }

  @Get('blocked')
  @ApiOperation({ summary: '獲取封鎖列表' })
  async getBlockedList(@CurrentUser() user: any) {
    return this.usersService.getBlockedList(user.userId);
  }

  @Get('rejected')
  @ApiOperation({ summary: '獲取拒收列表' })
  async getRejectedList(@CurrentUser() user: any) {
    return this.usersService.getRejectedList(user.userId);
  }

  @Get('check-license-plate/:plate')
  @ApiOperation({ summary: '檢查車牌是否可用' })
  async checkLicensePlate(@Param('plate') plate: string) {
    return this.usersService.checkLicensePlateAvailability(plate);
  }

  @Post('license-plate-application')
  @ApiOperation({ summary: '提交車牌申請' })
  async createLicensePlateApplication(
    @CurrentUser() user: any,
    @Body() dto: CreateLicensePlateApplicationDto,
  ) {
    return this.usersService.createLicensePlateApplication(user.userId, dto);
  }

  @Get('license-plate-application')
  @ApiOperation({ summary: '獲取我的車牌申請列表' })
  async getMyLicensePlateApplications(@CurrentUser() user: any) {
    return this.usersService.getMyLicensePlateApplications(user.userId);
  }

  @Get('license-plate-application/:id')
  @ApiOperation({ summary: '獲取車牌申請詳情' })
  async getLicensePlateApplication(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.usersService.getLicensePlateApplication(user.userId, id);
  }
}
