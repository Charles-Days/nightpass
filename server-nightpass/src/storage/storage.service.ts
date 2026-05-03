import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { join } from 'path';
import { existsSync, mkdirSync, unlink } from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string | null = null;
  private readonly r2PublicUrl: string | null = null;

  private readonly driver: 'local' | 'r2';
  private readonly localUploadsPath: string;
  private readonly localUploadsUrl: string;

  constructor(config: ConfigService) {
    this.driver = config.get<'local' | 'r2'>('STORAGE_DRIVER') || 'local';
    this.localUploadsPath = config.get<string>('LOCAL_UPLOADS_PATH') || './uploads';
    this.localUploadsUrl = config.get<string>('LOCAL_UPLOADS_URL') || 'http://localhost:7101/uploads';

    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET') ?? null;
    this.r2PublicUrl = config.get<string>('R2_PUBLIC_URL') ?? null;

    if (this.driver === 'r2' && accountId && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('Storage configurado: Cloudflare R2');
    } else {
      this.driver = 'local';
      this.ensureLocalDirectory();
      this.logger.log(`Storage configurado: LOCAL (Path: ${this.localUploadsPath})`);
    }
  }

  private ensureLocalDirectory() {
    const fullPath = join(process.cwd(), this.localUploadsPath);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
    ['venue', 'event', 'story'].forEach(dir => {
      const subDir = join(fullPath, `${dir}s`);
      if (!existsSync(subDir)) mkdirSync(subDir, { recursive: true });
    });
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<{ signedUrl: string; publicUrl: string }> {
    if (this.driver === 'local') {
      const signedUrl = `${this.localUploadsUrl.replace('/uploads', '')}/api/v1/uploads/local-put/${key}`;
      const publicUrl = `${this.localUploadsUrl.replace(/\/$/, '')}/${key}`;
      return { signedUrl, publicUrl };
    }

    if (!this.client || !this.bucket || !this.r2PublicUrl) {
      throw new Error('R2 no configurado correctamente');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return { signedUrl, publicUrl: `${this.r2PublicUrl.replace(/\/$/, '')}/${key}` };
  }

  /**
   * Extrae el `key` (path relativo) desde un publicUrl o URL relativa.
   * Devuelve null si la URL no pertenece a este storage.
   */
  keyFromPublicUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (this.driver === 'r2' && this.r2PublicUrl) {
      const base = this.r2PublicUrl.replace(/\/$/, '');
      if (url.startsWith(base + '/')) return url.slice(base.length + 1);
    }
    if (this.localUploadsUrl) {
      const base = this.localUploadsUrl.replace(/\/$/, '');
      if (url.startsWith(base + '/')) return url.slice(base.length + 1);
    }
    if (!url.startsWith('http')) return url.replace(/^\/+/, '');
    return null;
  }

  /**
   * Borra un objeto del storage. No throw si falla — solo loggea.
   */
  async delete(key: string): Promise<void> {
    if (!key) return;
    try {
      if (this.driver === 'r2' && this.client && this.bucket) {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        return;
      }
      const fullPath = join(process.cwd(), this.localUploadsPath, key);
      unlink(fullPath, () => undefined);
    } catch (err) {
      this.logger.warn(`Storage delete falló para "${key}": ${(err as Error).message}`);
    }
  }

  /**
   * Borra múltiples objetos. R2 soporta hasta 1000 por request.
   */
  async deleteMany(keys: string[]): Promise<void> {
    const filtered = keys.filter(Boolean);
    if (filtered.length === 0) return;

    if (this.driver === 'r2' && this.client && this.bucket) {
      try {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: filtered.map(Key => ({ Key })), Quiet: true },
          }),
        );
      } catch (err) {
        this.logger.warn(`Storage deleteMany falló: ${(err as Error).message}`);
      }
      return;
    }

    await Promise.all(filtered.map(k => this.delete(k)));
  }

  /**
   * Borra dado un publicUrl. Helper conveniente para servicios.
   */
  async deleteByPublicUrl(url: string | null | undefined): Promise<void> {
    const key = this.keyFromPublicUrl(url);
    if (key) await this.delete(key);
  }

  async deleteByPublicUrls(urls: (string | null | undefined)[]): Promise<void> {
    const keys = urls
      .map(u => this.keyFromPublicUrl(u))
      .filter((k): k is string => !!k);
    if (keys.length) await this.deleteMany(keys);
  }

  getDriver() {
    return this.driver;
  }

  getLocalPath() {
    return this.localUploadsPath;
  }
}
