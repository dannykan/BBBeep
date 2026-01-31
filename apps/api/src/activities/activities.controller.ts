import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService, CreateActivityDto } from './activities.service';
import { ActivityType } from '@prisma/client';

@ApiTags('Activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '記錄用戶活動' })
  async create(@Request() req, @Body() data: CreateActivityDto) {
    return this.activitiesService.create(req.user.id, data);
  }

  @Post('recording')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '記錄錄音完成' })
  async recordRecording(
    @Request() req,
    @Body()
    data: {
      voiceUrl: string;
      voiceDuration: number;
      transcript?: string;
      targetPlate?: string;
      vehicleType?: string;
      category?: string;
      latitude?: number;
      longitude?: number;
      location?: string;
    },
  ) {
    return this.activitiesService.create(req.user.id, {
      type: ActivityType.RECORDING_COMPLETE,
      ...data,
    });
  }

  @Post('text-edit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '記錄文字編輯（點擊下一步）' })
  async recordTextEdit(
    @Request() req,
    @Body()
    data: {
      messageText: string;
      targetPlate?: string;
      vehicleType?: string;
      category?: string;
      sendMode?: string;
      aiModerationResult?: any;
    },
  ) {
    return this.activitiesService.create(req.user.id, {
      type: ActivityType.TEXT_EDIT,
      ...data,
    });
  }

  @Post('ai-optimize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '記錄 AI 優化' })
  async recordAiOptimize(
    @Request() req,
    @Body()
    data: {
      messageText: string;
      voiceUrl?: string;
      voiceDuration?: number;
      transcript?: string;
      targetPlate?: string;
      vehicleType?: string;
      category?: string;
    },
  ) {
    return this.activitiesService.create(req.user.id, {
      type: ActivityType.AI_OPTIMIZE,
      ...data,
    });
  }

  @Post('sent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '記錄訊息發送成功' })
  async recordSent(
    @Request() req,
    @Body()
    data: {
      messageText: string;
      voiceUrl?: string;
      voiceDuration?: number;
      transcript?: string;
      targetPlate: string;
      vehicleType: string;
      category: string;
      sendMode: string;
      messageId: string;
      latitude?: number;
      longitude?: number;
      location?: string;
    },
  ) {
    return this.activitiesService.create(req.user.id, {
      type: ActivityType.MESSAGE_SENT,
      isSent: true,
      ...data,
    });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得我的活動記錄' })
  async getMyActivities(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.findByUser(req.user.id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}
