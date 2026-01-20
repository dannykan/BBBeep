import { IsInt, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RechargeDto {
  @ApiProperty({ example: 10, description: '儲值點數', enum: [10, 30, 50, 100] })
  @IsInt()
  @IsIn([10, 30, 50, 100], { message: '儲值點數必須為 10, 30, 50 或 100' })
  amount: number;
}
