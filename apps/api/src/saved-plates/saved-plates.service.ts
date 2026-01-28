import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSavedPlateDto, UpdateSavedPlateDto } from './dto/saved-plates.dto';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';

@Injectable()
export class SavedPlatesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSavedPlateDto) {
    // Normalize license plate
    const normalizedPlate = normalizeLicensePlate(dto.licensePlate);
    if (!normalizedPlate) {
      throw new ConflictException('車牌號碼格式無效');
    }

    // Check if already saved
    const existing = await this.prisma.savedPlate.findUnique({
      where: {
        userId_licensePlate: {
          userId,
          licensePlate: normalizedPlate,
        },
      },
    });

    if (existing) {
      throw new ConflictException('此車牌已收藏');
    }

    return this.prisma.savedPlate.create({
      data: {
        userId,
        licensePlate: normalizedPlate,
        nickname: dto.nickname,
        vehicleType: dto.vehicleType || 'car',
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.savedPlate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentSent(userId: string, limit: number = 5) {
    // Get recent sent messages, grouped by receiver's license plate
    const messages = await this.prisma.message.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: {
            licensePlate: true,
            vehicleType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Get more to filter unique plates
    });

    // Extract unique plates with vehicle type
    const seen = new Set<string>();
    const recentPlates: { licensePlate: string; vehicleType: string; lastSentAt: Date }[] = [];

    for (const message of messages) {
      if (message.receiver?.licensePlate && !seen.has(message.receiver.licensePlate)) {
        seen.add(message.receiver.licensePlate);
        recentPlates.push({
          licensePlate: message.receiver.licensePlate,
          vehicleType: message.receiver.vehicleType || 'car',
          lastSentAt: message.createdAt,
        });
        if (recentPlates.length >= limit) break;
      }
    }

    return recentPlates;
  }

  async checkIfSaved(userId: string, licensePlate: string) {
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      return { isSaved: false };
    }

    const savedPlate = await this.prisma.savedPlate.findUnique({
      where: {
        userId_licensePlate: {
          userId,
          licensePlate: normalizedPlate,
        },
      },
    });

    return {
      isSaved: !!savedPlate,
      savedPlate: savedPlate || undefined,
    };
  }

  async update(userId: string, id: string, dto: UpdateSavedPlateDto) {
    const savedPlate = await this.prisma.savedPlate.findFirst({
      where: { id, userId },
    });

    if (!savedPlate) {
      throw new NotFoundException('收藏的車牌不存在');
    }

    return this.prisma.savedPlate.update({
      where: { id },
      data: {
        nickname: dto.nickname,
        vehicleType: dto.vehicleType,
      },
    });
  }

  async delete(userId: string, id: string) {
    const savedPlate = await this.prisma.savedPlate.findFirst({
      where: { id, userId },
    });

    if (!savedPlate) {
      throw new NotFoundException('收藏的車牌不存在');
    }

    await this.prisma.savedPlate.delete({
      where: { id },
    });

    return { success: true };
  }
}
