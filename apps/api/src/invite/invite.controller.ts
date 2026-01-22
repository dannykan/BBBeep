import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InviteService } from './invite.service';
import { ApplyInviteCodeDto } from './dto/invite.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Invite')
@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Get('my-code')
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得我的邀請碼和統計' })
  async getMyInviteCode(@Request() req) {
    return this.inviteService.getMyInviteCode(req.user.userId);
  }

  @Get('validate/:code')
  @Public()
  @ApiOperation({ summary: '驗證邀請碼（onboarding 用，無需登入）' })
  async validateInviteCode(@Param('code') code: string) {
    return this.inviteService.validateInviteCode(code);
  }

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: '使用邀請碼' })
  async applyInviteCode(@Request() req, @Body() dto: ApplyInviteCodeDto) {
    return this.inviteService.applyInviteCode(req.user.userId, dto.code);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得我的邀請記錄' })
  async getInviteHistory(@Request() req) {
    return this.inviteService.getInviteHistory(req.user.userId);
  }
}
