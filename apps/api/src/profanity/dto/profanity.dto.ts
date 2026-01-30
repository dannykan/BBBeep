import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProfanityCategory, ProfanitySeverity } from '@prisma/client';

export class CreateProfanityDto {
  @ApiProperty({ description: '詞彙', example: '靠北' })
  @IsString()
  @MinLength(1)
  word: string;

  @ApiProperty({
    description: '類別',
    enum: ProfanityCategory,
    example: 'PROFANITY',
  })
  @IsEnum(ProfanityCategory)
  category: ProfanityCategory;

  @ApiPropertyOptional({
    description: '嚴重程度',
    enum: ProfanitySeverity,
    default: 'MEDIUM',
  })
  @IsOptional()
  @IsEnum(ProfanitySeverity)
  severity?: ProfanitySeverity;

  @ApiPropertyOptional({ description: '是否啟用', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '備註' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateProfanityDto {
  @ApiPropertyOptional({ description: '詞彙' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  word?: string;

  @ApiPropertyOptional({
    description: '類別',
    enum: ProfanityCategory,
  })
  @IsOptional()
  @IsEnum(ProfanityCategory)
  category?: ProfanityCategory;

  @ApiPropertyOptional({
    description: '嚴重程度',
    enum: ProfanitySeverity,
  })
  @IsOptional()
  @IsEnum(ProfanitySeverity)
  severity?: ProfanitySeverity;

  @ApiPropertyOptional({ description: '是否啟用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '備註' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ImportProfanityDto {
  @ApiProperty({
    description: '要匯入的詞彙列表',
    type: [CreateProfanityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProfanityDto)
  words: CreateProfanityDto[];
}

export class QueryProfanityDto {
  @ApiPropertyOptional({
    description: '類別篩選',
    enum: ProfanityCategory,
  })
  @IsOptional()
  @IsEnum(ProfanityCategory)
  category?: ProfanityCategory;

  @ApiPropertyOptional({
    description: '嚴重程度篩選',
    enum: ProfanitySeverity,
  })
  @IsOptional()
  @IsEnum(ProfanitySeverity)
  severity?: ProfanitySeverity;

  @ApiPropertyOptional({ description: '啟用狀態篩選' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '搜尋關鍵字' })
  @IsOptional()
  @IsString()
  search?: string;
}
