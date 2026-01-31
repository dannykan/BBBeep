import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RewriteDto {
  @ApiProperty({ example: '補充說明文字', description: '需要改寫的文字' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: '文字最多100字元' })
  text: string;

  @ApiProperty({
    required: false,
    enum: ['car', 'scooter'],
    description: '車輛類型',
  })
  @IsOptional()
  @IsIn(['car', 'scooter'])
  vehicleType?: 'car' | 'scooter';

  @ApiProperty({
    required: false,
    example: '車況提醒',
    description: '分類：車況提醒、行車安全、讚美感謝、其他情況',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
