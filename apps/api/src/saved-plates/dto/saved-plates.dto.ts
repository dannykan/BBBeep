import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateSavedPlateDto {
  @ApiProperty({ description: '車牌號碼', example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ description: '暱稱', example: '老婆的車' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiPropertyOptional({ description: '車輛類型', enum: VehicleType, default: 'car' })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;
}

export class UpdateSavedPlateDto {
  @ApiPropertyOptional({ description: '暱稱', example: '老婆的車' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: '車輛類型', enum: VehicleType })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;
}

export class SavedPlateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  licensePlate: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty({ enum: VehicleType })
  vehicleType: VehicleType;

  @ApiProperty()
  createdAt: Date;
}

export class RecentSentPlateResponseDto {
  @ApiProperty()
  licensePlate: string;

  @ApiProperty({ enum: VehicleType })
  vehicleType: VehicleType;

  @ApiProperty()
  lastSentAt: Date;
}

export class CheckSavedPlateResponseDto {
  @ApiProperty()
  isSaved: boolean;

  @ApiPropertyOptional()
  savedPlate?: SavedPlateResponseDto;
}
