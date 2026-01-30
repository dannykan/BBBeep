import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ProfanityService } from './profanity.service';
import {
  CreateProfanityDto,
  UpdateProfanityDto,
  ImportProfanityDto,
  QueryProfanityDto,
} from './dto/profanity.dto';
import { AdminService } from '../admin/admin.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('profanity')
@Controller('profanity')
@Public() // 公開 API 不需要 JWT，Admin API 使用 x-admin-token 驗證
export class ProfanityController {
  constructor(
    private readonly profanityService: ProfanityService,
    private readonly adminService: AdminService,
  ) {}

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
  @ApiOperation({ summary: '[Admin] 取得所有詞彙' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async findAll(
    @Headers('x-admin-token') token: string,
    @Query() query: QueryProfanityDto,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.profanityService.findAll({
      category: query.category,
      severity: query.severity,
      isActive: query.isActive,
      search: query.search,
    });
  }

  @Post('admin')
  @ApiOperation({ summary: '[Admin] 新增詞彙' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async create(
    @Headers('x-admin-token') token: string,
    @Body() dto: CreateProfanityDto,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.profanityService.create(dto);
  }

  @Post('admin/import')
  @ApiOperation({ summary: '[Admin] 批量匯入詞彙' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async import(
    @Headers('x-admin-token') token: string,
    @Body() dto: ImportProfanityDto,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.profanityService.importFromLocal(dto);
  }

  @Put('admin/:id')
  @ApiOperation({ summary: '[Admin] 更新詞彙' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async update(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
    @Body() dto: UpdateProfanityDto,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.profanityService.update(id, dto);
  }

  @Put('admin/:id/toggle')
  @ApiOperation({ summary: '[Admin] 切換啟用狀態' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async toggleActive(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.profanityService.toggleActive(id);
  }

  @Delete('admin/:id')
  @ApiOperation({ summary: '[Admin] 刪除詞彙' })
  @ApiHeader({ name: 'x-admin-token', required: true })
  async delete(
    @Headers('x-admin-token') token: string,
    @Param('id') id: string,
  ) {
    const isValid = await this.adminService.verifyToken(token);
    if (!isValid) {
      throw new UnauthorizedException('無效的管理員 token');
    }
    return this.profanityService.delete(id);
  }
}
