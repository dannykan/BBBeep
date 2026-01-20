import { IsString, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType, VehicleType } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: '暱稱', description: '用戶暱稱' })
  @IsString()
  @IsOptional()
  @MaxLength(12, { message: '暱稱最多12字元' })
  nickname?: string;

  @ApiProperty({ required: false, example: 'ABC-1234', description: '車牌號碼' })
  @IsString()
  @IsOptional()
  licensePlate?: string;

  @ApiProperty({ required: false, enum: UserType, description: '用戶類型' })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @ApiProperty({ required: false, enum: VehicleType, description: '車輛類型' })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiProperty({ required: false, example: 'user@example.com', description: '電子郵件' })
  @IsString()
  @IsOptional()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: '電子郵件格式錯誤' })
  email?: string;
}

export class CompleteOnboardingDto {
  @ApiProperty({ enum: UserType, description: '用戶類型' })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({ required: false, enum: VehicleType, description: '車輛類型' })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiProperty({ required: false, example: 'ABC-1234', description: '車牌號碼' })
  @IsString()
  @IsOptional()
  licensePlate?: string;

  @ApiProperty({ required: false, example: '暱稱', description: '用戶暱稱' })
  @IsString()
  @IsOptional()
  @MaxLength(12, { message: '暱稱最多12字元' })
  nickname?: string;
}
