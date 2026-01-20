import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}
