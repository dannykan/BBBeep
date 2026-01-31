import { Controller, Post, Delete, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto/register-device.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device')
  @ApiOperation({ summary: '註冊裝置推播 Token' })
  async registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    const userId = req.user.id;
    await this.notificationsService.registerDevice(userId, dto.token, dto.platform);
    return { message: '裝置註冊成功' };
  }

  @Delete('device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除裝置推播 Token' })
  async unregisterDevice(@Req() req: any, @Body() dto: UnregisterDeviceDto) {
    const userId = req.user.id;
    await this.notificationsService.unregisterDevice(userId, dto.token);
    return { message: '裝置已移除' };
  }
}
