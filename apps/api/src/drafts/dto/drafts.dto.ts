import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export enum DraftStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  SENT = 'SENT',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED',
}

export class CreateDraftDto {
  @ApiProperty({ description: '語音檔案 URL（上傳後）' })
  @IsString()
  voiceUrl: string;

  @ApiProperty({ description: '語音時長（秒）' })
  @IsNumber()
  @Min(1)
  @Max(60)
  voiceDuration: number;

  @ApiPropertyOptional({ description: '語音轉文字結果（如果前端已處理）' })
  @IsString()
  @IsOptional()
  transcript?: string;

  @ApiPropertyOptional({ description: '緯度' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: '經度' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: '地址' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateDraftDto {
  @ApiPropertyOptional({ description: '用戶選擇的車牌' })
  @IsString()
  @IsOptional()
  selectedPlate?: string;

  @ApiPropertyOptional({ description: '狀態' })
  @IsEnum(DraftStatus)
  @IsOptional()
  status?: DraftStatus;
}

export class SendFromDraftDto {
  @ApiProperty({ description: '用戶確認的車牌' })
  @IsString()
  selectedPlate: string;

  @ApiProperty({ description: '車輛類型', enum: ['car', 'scooter'] })
  @IsEnum(['car', 'scooter'])
  vehicleType: 'car' | 'scooter';

  @ApiProperty({
    description: '訊息類別',
    enum: ['VEHICLE_REMINDER', 'SAFETY_REMINDER', 'PRAISE', 'OTHER'],
  })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: '情境（如果選擇預設情境）' })
  @IsString()
  @IsOptional()
  situation?: string;

  @ApiPropertyOptional({ description: '自訂訊息' })
  @IsString()
  @IsOptional()
  customText?: string;

  @ApiProperty({ description: '是否使用 AI 建議訊息' })
  @IsBoolean()
  useAiSuggestion: boolean;

  @ApiProperty({
    description: '發送模式',
    enum: ['text', 'voice', 'ai'],
  })
  @IsEnum(['text', 'voice', 'ai'])
  sendMode: 'text' | 'voice' | 'ai';
}

// Response DTOs
export class ParsedPlateDto {
  @ApiProperty({ description: '車牌號碼' })
  plate: string;

  @ApiProperty({ description: '信心度 0-1' })
  confidence: number;
}

export class ParsedVehicleDto {
  @ApiProperty({ description: '車輛類型', enum: ['car', 'scooter', 'unknown'] })
  type: 'car' | 'scooter' | 'unknown';

  @ApiPropertyOptional({ description: '顏色' })
  color?: string;

  @ApiPropertyOptional({ description: '品牌' })
  brand?: string;

  @ApiPropertyOptional({ description: '型號' })
  model?: string;
}

export class ParsedEventDto {
  @ApiProperty({
    description: '事件類別',
    enum: ['VEHICLE_REMINDER', 'SAFETY_REMINDER', 'PRAISE', 'OTHER'],
  })
  category: string;

  @ApiProperty({ description: '事件類型代碼' })
  type: string;

  @ApiProperty({ description: '事件描述' })
  description: string;

  @ApiPropertyOptional({ description: '發生地點' })
  location?: string;

  @ApiProperty({
    description: '情緒',
    enum: ['positive', 'negative', 'neutral'],
  })
  sentiment: string;
}

export class DraftResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  voiceUrl: string;

  @ApiProperty()
  voiceDuration: number;

  @ApiPropertyOptional()
  transcript?: string;

  @ApiProperty({ type: [ParsedPlateDto] })
  parsedPlates: ParsedPlateDto[];

  @ApiPropertyOptional({ type: ParsedVehicleDto })
  parsedVehicle?: ParsedVehicleDto;

  @ApiPropertyOptional({ type: ParsedEventDto })
  parsedEvent?: ParsedEventDto;

  @ApiPropertyOptional()
  suggestedMessage?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty({ enum: DraftStatus })
  status: DraftStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt: Date;
}

export class DraftListResponseDto {
  @ApiProperty({ type: [DraftResponseDto] })
  drafts: DraftResponseDto[];

  @ApiProperty()
  count: number;
}

export class SendFromDraftResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  messageId: string;

  @ApiProperty()
  pointsUsed: number;

  @ApiProperty()
  remainingPoints: number;
}

// 測試用 DTO
export class TestParseDto {
  @ApiProperty({ description: '語音轉文字內容' })
  @IsString()
  transcript: string;
}

export class TestParseResponseDto {
  @ApiProperty({ type: [ParsedPlateDto] })
  plates: ParsedPlateDto[];

  @ApiProperty({ type: ParsedVehicleDto })
  vehicle: ParsedVehicleDto;

  @ApiProperty({ type: ParsedEventDto })
  event: ParsedEventDto;

  @ApiProperty()
  suggestedMessage: string;
}
