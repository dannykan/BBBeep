import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DraftsService } from './drafts.service';
import {
  CreateDraftDto,
  UpdateDraftDto,
  DraftResponseDto,
  DraftListResponseDto,
  TestParseDto,
  TestParseResponseDto,
} from './dto/drafts.dto';

@ApiTags('drafts')
@Controller('drafts')
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '建立語音草稿' })
  @ApiResponse({ status: 201, type: DraftResponseDto })
  async create(@Request() req, @Body() dto: CreateDraftDto): Promise<DraftResponseDto> {
    return this.draftsService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得所有草稿' })
  @ApiResponse({ status: 200, type: DraftListResponseDto })
  async findAll(@Request() req): Promise<DraftListResponseDto> {
    const drafts = await this.draftsService.findAll(req.user.id);
    return {
      drafts,
      count: drafts.length,
    };
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得待處理草稿數量' })
  @ApiResponse({ status: 200 })
  async getCount(@Request() req): Promise<{ count: number }> {
    const count = await this.draftsService.getPendingCount(req.user.id);
    return { count };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得單一草稿' })
  @ApiResponse({ status: 200, type: DraftResponseDto })
  async findOne(@Request() req, @Param('id') id: string): Promise<DraftResponseDto> {
    return this.draftsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新草稿' })
  @ApiResponse({ status: 200, type: DraftResponseDto })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
  ): Promise<DraftResponseDto> {
    return this.draftsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除草稿' })
  @ApiResponse({ status: 204 })
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    return this.draftsService.delete(req.user.id, id);
  }

  @Post(':id/sent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '標記草稿為已發送' })
  @ApiResponse({ status: 200 })
  async markAsSent(@Request() req, @Param('id') id: string): Promise<void> {
    return this.draftsService.markAsSent(req.user.id, id);
  }

  // ====== 開發/測試用 API ======

  @Post('test/parse')
  @ApiOperation({ summary: '測試語音解析（開發用）' })
  @ApiResponse({ status: 200, type: TestParseResponseDto })
  async testParse(@Body() dto: TestParseDto): Promise<TestParseResponseDto> {
    return this.draftsService.testParse(dto.transcript);
  }
}
