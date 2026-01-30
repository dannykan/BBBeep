import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfanityService } from './profanity.service';
import {
  CreateProfanityDto,
  UpdateProfanityDto,
  ImportProfanityDto,
  QueryProfanityDto,
} from './dto/profanity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('profanity')
@Controller('profanity')
export class ProfanityController {
  constructor(private readonly profanityService: ProfanityService) {}

  // ============ 公開 API（供 App 使用）============

  @Get('version')
  @ApiOperation({ summary: '取得詞庫版本' })
  async getVersion() {
    return this.profanityService.getVersion();
  }

  @Get('dictionary')
  @ApiOperation({ summary: '取得詞庫（供 App 下載）' })
  async getDictionary() {
    return this.profanityService.getDictionary();
  }

  // ============ Admin API ============

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 取得所有詞彙' })
  async findAll(@Query() query: QueryProfanityDto) {
    return this.profanityService.findAll({
      category: query.category,
      severity: query.severity,
      isActive: query.isActive,
      search: query.search,
    });
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 新增詞彙' })
  async create(@Body() dto: CreateProfanityDto) {
    return this.profanityService.create(dto);
  }

  @Post('admin/import')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 批量匯入詞彙' })
  async import(@Body() dto: ImportProfanityDto) {
    return this.profanityService.importFromLocal(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 更新詞彙' })
  async update(@Param('id') id: string, @Body() dto: UpdateProfanityDto) {
    return this.profanityService.update(id, dto);
  }

  @Put('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 切換啟用狀態' })
  async toggleActive(@Param('id') id: string) {
    return this.profanityService.toggleActive(id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 刪除詞彙' })
  async delete(@Param('id') id: string) {
    return this.profanityService.delete(id);
  }
}
