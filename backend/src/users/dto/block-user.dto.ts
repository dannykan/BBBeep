import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({ example: 'user-id', description: '要封鎖的用戶ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class RejectUserDto {
  @ApiProperty({ example: 'user-id', description: '要拒收的用戶ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
