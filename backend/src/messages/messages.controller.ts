import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ReplyMessageDto } from './dto/reply-message.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: '發送提醒' })
  async create(@CurrentUser() user: any, @Body() dto: CreateMessageDto) {
    return this.messagesService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '獲取收到的提醒列表' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: '僅顯示未讀' })
  async findAll(@CurrentUser() user: any, @Query('unreadOnly') unreadOnly?: string) {
    return this.messagesService.findAll(user.userId, unreadOnly === 'true');
  }

  @Get('sent')
  @ApiOperation({ summary: '獲取發送的提醒列表' })
  async findSent(@CurrentUser() user: any) {
    return this.messagesService.findSent(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '獲取訊息詳情' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.messagesService.findOne(user.userId, id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '標記訊息為已讀' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.messagesService.markAsRead(user.userId, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: '回覆訊息（僅供記錄，不會通知發送者）' })
  async replyToMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReplyMessageDto,
  ) {
    return this.messagesService.replyToMessage(user.userId, id, dto.replyText);
  }

  @Post(':id/report')
  @ApiOperation({ summary: '檢舉訊息內容' })
  async reportMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReportMessageDto,
  ) {
    return this.messagesService.reportMessage(user.userId, id, dto.reason);
  }
}
