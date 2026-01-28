import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SavedPlatesService } from './saved-plates.service';
import { CreateSavedPlateDto, UpdateSavedPlateDto } from './dto/saved-plates.dto';

@ApiTags('Saved Plates')
@Controller('saved-plates')
@ApiBearerAuth()
export class SavedPlatesController {
  constructor(private readonly savedPlatesService: SavedPlatesService) {}

  @Post()
  @ApiOperation({ summary: '收藏車牌' })
  async create(@Request() req, @Body() dto: CreateSavedPlateDto) {
    return this.savedPlatesService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '取得所有收藏的車牌' })
  async findAll(@Request() req) {
    return this.savedPlatesService.findAll(req.user.userId);
  }

  @Get('recent-sent')
  @ApiOperation({ summary: '取得最近發送的車牌' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentSent(@Request() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.savedPlatesService.getRecentSent(req.user.userId, limitNum);
  }

  @Get('check/:licensePlate')
  @ApiOperation({ summary: '檢查車牌是否已收藏' })
  async checkIfSaved(@Request() req, @Param('licensePlate') licensePlate: string) {
    return this.savedPlatesService.checkIfSaved(req.user.userId, licensePlate);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新收藏的車牌' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSavedPlateDto) {
    return this.savedPlatesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除收藏的車牌' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.savedPlatesService.delete(req.user.userId, id);
  }
}
