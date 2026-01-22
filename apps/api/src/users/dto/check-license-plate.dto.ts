import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckLicensePlateDto {
  @ApiProperty({ example: 'BBP-2999', description: '車牌號碼' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;
}
