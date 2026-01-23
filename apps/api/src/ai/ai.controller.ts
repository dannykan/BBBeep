import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { RewriteDto } from './dto/rewrite.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('rewrite/limit')
  @ApiOperation({ summary: '檢查 AI 改寫每日使用限制' })
  async checkLimit(@CurrentUser() user: any) {
    return this.aiService.checkDailyLimit(user.userId);
  }

  @Post('rewrite/reset')
  @ApiOperation({ summary: '重置 AI 改寫每日使用次數（成功發送訊息後自動重置）' })
  async resetLimit(@CurrentUser() user: any) {
    return this.aiService.resetDailyLimit(user.userId);
  }

  @Post('rewrite')
  @ApiOperation({ summary: 'AI 改寫文字（每日5次限制）' })
  async rewrite(@CurrentUser() user: any, @Body() dto: RewriteDto) {
    const rewritten = await this.aiService.rewrite(
      user.userId,
      dto.text,
      dto.vehicleType,
      dto.category,
    );
    return { rewritten };
  }

  @Post('moderate')
  @ApiOperation({ summary: 'AI 內容審核（判斷內容是否適合發送）' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要審核的文字內容' },
      },
      required: ['text'],
    },
  })
  async moderateContent(@Body('text') text: string) {
    return this.aiService.moderateContent(text);
  }
}
