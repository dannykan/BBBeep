/**
 * Cloudflare R2 Storage Service
 * 用於上傳語音檔案到 R2 儲存
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'ubeep-voice';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('R2 storage service initialized');
    } else {
      this.logger.warn('R2 credentials not configured, voice upload will be disabled');
    }
  }

  /**
   * 檢查 R2 是否已設定
   */
  isConfigured(): boolean {
    return this.s3Client !== null;
  }

  /**
   * 上傳語音檔案到 R2
   */
  async uploadVoice(buffer: Buffer, mimetype: string, originalname: string): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('R2 storage is not configured');
    }

    // 生成唯一的 key
    const ext = originalname.split('.').pop() || 'm4a';
    const key = `voice/${uuidv4()}.${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );

      // 構建公開 URL
      const url = this.publicUrl ? `${this.publicUrl}/${key}` : await this.getSignedUrl(key);

      this.logger.log(`Voice file uploaded: ${key}`);

      return {
        url,
        key,
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload voice file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 取得簽名 URL（用於私有存取）
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('R2 storage is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * 刪除檔案
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('R2 storage is not configured');
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw error;
    }
  }
}
