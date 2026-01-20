import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

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
  template: string;

  @ApiProperty({ required: false, example: '補充說明', description: '補充說明（可選）' })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '補充說明最多100字元' })
  customText?: string;

  @ApiProperty({ required: false, example: false, description: '是否使用AI改寫' })
  @IsOptional()
  useAiRewrite?: boolean;
}
