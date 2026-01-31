import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';

export class CreateLicensePlateApplicationDto {
  @ApiProperty({ example: 'BBP-2999', description: '車牌號碼' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ required: false, enum: VehicleType, description: '車輛類型' })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiProperty({
    required: false,
    example: 'https://example.com/image.jpg',
    description: '行照照片 URL',
  })
  @IsString()
  @IsOptional()
  licenseImage?: string;

  @ApiProperty({
    required: false,
    example: 'user@example.com',
    description: '申請人 Email（用於通知審核結果）',
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}
