import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IAPPlatformDto {
  ios = 'ios',
  android = 'android',
}

export class VerifyIAPDto {
  @ApiProperty({ description: '交易 ID (transactionId for iOS, purchaseToken for Android)' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: '產品 ID', example: 'com.ubeep.mobile.points_15' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '平台', enum: IAPPlatformDto })
  @IsEnum(IAPPlatformDto)
  platform: IAPPlatformDto;

  @ApiProperty({
    description: '收據數據 (iOS: transactionReceipt, Android: purchaseToken)',
    required: false,
  })
  @IsString()
  @IsOptional()
  receiptData?: string;
}

export class VerifyIAPResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '新增的點數' })
  pointsAwarded: number;

  @ApiProperty({ description: '新的點數餘額' })
  newBalance: number;

  @ApiProperty({ description: '錯誤訊息', required: false })
  error?: string;
}
