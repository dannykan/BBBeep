import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppleLoginDto {
  @ApiProperty({
    description: 'Apple Identity Token (JWT)',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiPropertyOptional({
    description: '用戶全名（僅首次登入時 Apple 會提供）',
    example: '王小明',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: '用戶 Email（僅首次登入時 Apple 會提供，可能是 private relay email）',
    example: 'user@privaterelay.appleid.com',
  })
  @IsOptional()
  @IsString()
  email?: string;
}
