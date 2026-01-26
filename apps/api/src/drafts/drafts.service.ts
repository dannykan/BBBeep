import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VoiceParserService, ParsedVoiceContent } from './voice-parser.service';
import {
  CreateDraftDto,
  UpdateDraftDto,
  DraftStatus,
  DraftResponseDto,
} from './dto/drafts.dto';

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  // 草稿過期時間（24 小時）
  private readonly DRAFT_EXPIRY_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private voiceParser: VoiceParserService,
  ) {}

  /**
   * 建立新草稿並啟動 AI 解析
   */
  async create(userId: string, dto: CreateDraftDto): Promise<DraftResponseDto> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.DRAFT_EXPIRY_HOURS);

    // 建立草稿（PROCESSING 狀態）
    const draft = await this.prisma.voiceDraft.create({
      data: {
        userId,
        voiceUrl: dto.voiceUrl,
        voiceDuration: dto.voiceDuration,
        transcript: dto.transcript,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        status: DraftStatus.PROCESSING,
        expiresAt,
        parsedPlates: [],
      },
    });

    // 非同步執行 AI 解析（不阻塞回應）
    this.processVoiceDraft(draft.id, dto.transcript).catch((err) => {
      this.logger.error(`Failed to process draft ${draft.id}: ${err.message}`);
    });

    return this.formatDraftResponse(draft);
  }

  /**
   * 取得用戶的所有草稿
   */
  async findAll(userId: string): Promise<DraftResponseDto[]> {
    const drafts = await this.prisma.voiceDraft.findMany({
      where: {
        userId,
        status: {
          in: [
            DraftStatus.PENDING,
            DraftStatus.PROCESSING,
            DraftStatus.READY,
          ],
        },
        expiresAt: {
          gt: new Date(), // 未過期
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return drafts.map((d) => this.formatDraftResponse(d));
  }

  /**
   * 取得單一草稿
   */
  async findOne(userId: string, draftId: string): Promise<DraftResponseDto> {
    const draft = await this.prisma.voiceDraft.findFirst({
      where: {
        id: draftId,
        userId,
      },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return this.formatDraftResponse(draft);
  }

  /**
   * 更新草稿
   */
  async update(
    userId: string,
    draftId: string,
    dto: UpdateDraftDto,
  ): Promise<DraftResponseDto> {
    const draft = await this.prisma.voiceDraft.findFirst({
      where: { id: draftId, userId },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    const updated = await this.prisma.voiceDraft.update({
      where: { id: draftId },
      data: dto,
    });

    return this.formatDraftResponse(updated);
  }

  /**
   * 刪除草稿
   */
  async delete(userId: string, draftId: string): Promise<void> {
    const draft = await this.prisma.voiceDraft.findFirst({
      where: { id: draftId, userId },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    await this.prisma.voiceDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.DELETED },
    });
  }

  /**
   * 標記草稿為已發送
   */
  async markAsSent(userId: string, draftId: string): Promise<void> {
    await this.prisma.voiceDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.SENT },
    });
  }

  /**
   * 取得待處理草稿數量（用於 badge）
   */
  async getPendingCount(userId: string): Promise<number> {
    return this.prisma.voiceDraft.count({
      where: {
        userId,
        status: DraftStatus.READY,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * 清理過期草稿（由 Cron Job 呼叫）
   */
  async cleanupExpiredDrafts(): Promise<number> {
    const result = await this.prisma.voiceDraft.updateMany({
      where: {
        status: {
          in: [DraftStatus.PENDING, DraftStatus.PROCESSING, DraftStatus.READY],
        },
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: DraftStatus.EXPIRED,
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired drafts`);
    return result.count;
  }

  /**
   * 處理語音草稿（AI 解析）
   */
  private async processVoiceDraft(
    draftId: string,
    transcript?: string,
  ): Promise<void> {
    try {
      // 如果沒有 transcript，需要先轉文字
      // 這裡假設前端已經處理好 transcript
      if (!transcript) {
        this.logger.warn(`Draft ${draftId} has no transcript, skipping AI parse`);
        await this.prisma.voiceDraft.update({
          where: { id: draftId },
          data: { status: DraftStatus.READY },
        });
        return;
      }

      // AI 解析
      const parsed = await this.voiceParser.parseVoiceContent(transcript);

      // 更新草稿
      await this.prisma.voiceDraft.update({
        where: { id: draftId },
        data: {
          parsedPlates: parsed.plates.map((p) => p.plate),
          parsedVehicle: parsed.vehicle as any,
          parsedEvent: parsed.event as any,
          suggestedMessage: parsed.suggestedMessage,
          status: DraftStatus.READY,
        },
      });

      this.logger.log(`Draft ${draftId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process draft ${draftId}: ${error.message}`);
      // 即使解析失敗，也設為 READY，讓用戶可以手動處理
      await this.prisma.voiceDraft.update({
        where: { id: draftId },
        data: { status: DraftStatus.READY },
      });
    }
  }

  /**
   * 測試解析功能（開發用）
   */
  async testParse(transcript: string): Promise<ParsedVoiceContent> {
    return this.voiceParser.parseVoiceContent(transcript);
  }

  private formatDraftResponse(draft: any): DraftResponseDto {
    // 從 parsedPlates 陣列建立帶有 confidence 的結構
    const plates = Array.isArray(draft.parsedPlates)
      ? draft.parsedPlates.map((plate: string, index: number) => ({
          plate,
          confidence: Math.max(0.9 - index * 0.15, 0.5), // 遞減信心度
        }))
      : [];

    return {
      id: draft.id,
      voiceUrl: draft.voiceUrl,
      voiceDuration: draft.voiceDuration,
      transcript: draft.transcript,
      parsedPlates: plates,
      parsedVehicle: draft.parsedVehicle,
      parsedEvent: draft.parsedEvent,
      suggestedMessage: draft.suggestedMessage,
      latitude: draft.latitude,
      longitude: draft.longitude,
      address: draft.address,
      status: draft.status as DraftStatus,
      createdAt: draft.createdAt,
      expiresAt: draft.expiresAt,
    };
  }
}
