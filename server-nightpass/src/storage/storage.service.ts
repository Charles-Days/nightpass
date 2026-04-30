import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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

    // R2 Config
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
    // Sub-directorios comunes
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
      // Para local, devolvemos una URL que apunte a nuestro propio endpoint de carga
      // Eliminamos el prefijo 'api/v1' si está configurado globalmente para que coincida con el controller
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

  getDriver() {
    return this.driver;
  }

  getLocalPath() {
    return this.localUploadsPath;
  }
}
