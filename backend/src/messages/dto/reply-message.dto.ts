import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyMessageDto {
  @ApiProperty({ example: '謝謝您的提醒！', description: '回覆內容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: '回覆內容最多200字元' })
  replyText: string;
}
