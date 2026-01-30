import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProfanityCategory, ProfanitySeverity } from '@prisma/client';
import { CreateProfanityDto, UpdateProfanityDto, ImportProfanityDto } from './dto/profanity.dto';

@Injectable()
export class ProfanityService {
  constructor(private prisma: PrismaService) {}

  /**
   * 取得詞庫版本（供 App 檢查是否需要更新）
   */
  async getVersion() {
    const latest = await this.prisma.profanityDictVersion.findFirst({
      orderBy: { version: 'desc' },
    });
    return { version: latest?.version || 0 };
  }

  /**
   * 取得所有啟用的詞彙（供 App 下載）
   */
  async getDictionary() {
    const version = await this.getVersion();
    const words = await this.prisma.profanityWord.findMany({
      where: { isActive: true },
      select: {
        word: true,
        category: true,
        severity: true,
      },
      orderBy: { word: 'asc' },
    });

    // 按類別分組
    const grouped = {
      PROFANITY: [] as string[],
      THREAT: [] as string[],
      HARASSMENT: [] as string[],
      DISCRIMINATION: [] as string[],
      HIGH_SEVERITY: [] as string[],
      MEDIUM_SEVERITY: [] as string[],
    };

    for (const w of words) {
      grouped[w.category].push(w.word);
      if (w.severity === 'HIGH') {
        grouped.HIGH_SEVERITY.push(w.word);
      } else if (w.severity === 'MEDIUM') {
        grouped.MEDIUM_SEVERITY.push(w.word);
      }
    }

    return {
      version: version.version,
      words: grouped,
      totalCount: words.length,
    };
  }

  /**
   * 取得所有詞彙（Admin 用，包含停用的）
   */
  async findAll(options?: {
    category?: ProfanityCategory;
    severity?: ProfanitySeverity;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.severity) {
      where.severity = options.severity;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.search) {
      where.word = { contains: options.search, mode: 'insensitive' };
    }

    const words = await this.prisma.profanityWord.findMany({
      where,
      orderBy: [{ category: 'asc' }, { word: 'asc' }],
    });

    // 統計
    const stats = await this.prisma.profanityWord.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isActive: true },
    });

    const categoryStats = stats.reduce((acc, s) => {
      acc[s.category] = s._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      words,
      stats: {
        total: words.length,
        active: words.filter((w) => w.isActive).length,
        byCategory: categoryStats,
      },
    };
  }

  /**
   * 新增詞彙
   */
  async create(dto: CreateProfanityDto) {
    const word = await this.prisma.profanityWord.create({
      data: {
        word: dto.word.trim(),
        category: dto.category,
        severity: dto.severity || 'MEDIUM',
        isActive: dto.isActive ?? true,
        note: dto.note,
      },
    });

    // 更新版本
    await this.incrementVersion('新增詞彙: ' + dto.word);

    return word;
  }

  /**
   * 批量新增詞彙
   */
  async createMany(words: CreateProfanityDto[]) {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const dto of words) {
      try {
        // 檢查是否已存在
        const existing = await this.prisma.profanityWord.findUnique({
          where: { word: dto.word.trim() },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await this.prisma.profanityWord.create({
          data: {
            word: dto.word.trim(),
            category: dto.category,
            severity: dto.severity || 'MEDIUM',
            isActive: dto.isActive ?? true,
            note: dto.note,
          },
        });
        results.created++;
      } catch (error: any) {
        results.errors.push(`${dto.word}: ${error.message}`);
      }
    }

    if (results.created > 0) {
      await this.incrementVersion(`批量新增 ${results.created} 個詞彙`);
    }

    return results;
  }

  /**
   * 更新詞彙
   */
  async update(id: string, dto: UpdateProfanityDto) {
    const existing = await this.prisma.profanityWord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('詞彙不存在');
    }

    const word = await this.prisma.profanityWord.update({
      where: { id },
      data: {
        word: dto.word?.trim(),
        category: dto.category,
        severity: dto.severity,
        isActive: dto.isActive,
        note: dto.note,
      },
    });

    await this.incrementVersion('更新詞彙: ' + (dto.word || existing.word));

    return word;
  }

  /**
   * 刪除詞彙
   */
  async delete(id: string) {
    const existing = await this.prisma.profanityWord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('詞彙不存在');
    }

    await this.prisma.profanityWord.delete({
      where: { id },
    });

    await this.incrementVersion('刪除詞彙: ' + existing.word);

    return { success: true };
  }

  /**
   * 切換啟用狀態
   */
  async toggleActive(id: string) {
    const existing = await this.prisma.profanityWord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('詞彙不存在');
    }

    const word = await this.prisma.profanityWord.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    await this.incrementVersion(
      `${word.isActive ? '啟用' : '停用'}詞彙: ${word.word}`,
    );

    return word;
  }

  /**
   * 從現有詞庫匯入（初始化用）
   */
  async importFromLocal(dto: ImportProfanityDto) {
    const results = await this.createMany(dto.words);
    return results;
  }

  /**
   * 遞增版本號
   */
  private async incrementVersion(description?: string) {
    await this.prisma.profanityDictVersion.create({
      data: { description },
    });
  }

  /**
   * 檢查文字是否包含不當詞彙
   */
  async checkContent(text: string): Promise<{
    hasIssue: boolean;
    matches: Array<{ word: string; category: string; severity: string }>;
  }> {
    const words = await this.prisma.profanityWord.findMany({
      where: { isActive: true },
      select: { word: true, category: true, severity: true },
    });

    const lowerText = text.toLowerCase();
    const matches: Array<{ word: string; category: string; severity: string }> = [];

    for (const w of words) {
      if (lowerText.includes(w.word.toLowerCase())) {
        matches.push({
          word: w.word,
          category: w.category,
          severity: w.severity,
        });
      }
    }

    return {
      hasIssue: matches.length > 0,
      matches,
    };
  }
}
