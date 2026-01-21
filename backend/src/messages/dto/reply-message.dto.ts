import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyMessageDto {
  @ApiProperty({ example: '謝謝您的提醒！', description: '回覆內容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: '回覆內容最多200字元' })
  replyText: string;

  @ApiProperty({ required: false, example: false, description: '是否為快速回覆（免費）' })
  @IsBoolean()
  @IsOptional()
  isQuickReply?: boolean;

  @ApiProperty({ required: false, example: false, description: '是否使用 AI 改寫' })
  @IsBoolean()
  @IsOptional()
  useAiRewrite?: boolean;
}
