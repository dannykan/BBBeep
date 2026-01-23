import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength, IsDateString, IsNumber, Min, Max, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';
import { IsContentSafe } from '../../common/decorators';

export class CreateMessageDto {
  @ApiProperty({ example: 'ABC-1234', description: '目標車牌號碼' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({
    enum: ['車況提醒', '行車安全提醒', '讚美感謝'],
    description: '提醒類型',
    example: '車況提醒'
  })
  @IsIn(['車況提醒', '行車安全提醒', '讚美感謝'], {
    message: 'type must be one of: 車況提醒, 行車安全提醒, 讚美感謝'
  })
  type: string; // 前端發送中文，後端會轉換為 enum

  @ApiProperty({ example: '您的車燈未開', description: '範本內容' })
  @IsString()
  @IsNotEmpty()
  @IsContentSafe()
  template: string;

  @ApiProperty({ required: false, example: '補充說明', description: '補充說明（可選）' })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '補充說明最多100字元' })
  @IsContentSafe()
  customText?: string;

  @ApiProperty({ required: false, example: false, description: '是否使用AI改寫' })
  @IsOptional()
  useAiRewrite?: boolean;

  @ApiProperty({ required: false, example: '台北市信義區松高路12號', description: '事發地點（可選）' })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '地點最多200字元' })
  location?: string;

  @ApiProperty({ required: false, example: '2026-01-21T10:30:00.000Z', description: '事發時間 ISO 8601 格式（可選）' })
  @IsDateString()
  @IsOptional()
  occurredAt?: string;

  @ApiProperty({ required: false, example: 'https://r2.example.com/voice/xxx.m4a', description: '語音檔案 URL（可選）' })
  @IsString()
  @IsOptional()
  voiceUrl?: string;

  @ApiProperty({ required: false, example: 10, description: '語音長度（秒）' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(15)
  voiceDuration?: number;
}
