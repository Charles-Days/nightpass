import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicUrl: string | null;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET') ?? null;
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? null;

    if (accountId && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
      this.logger.warn(
        'R2 en modo no-op: define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET para subir imágenes reales.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<{ signedUrl: string; publicUrl: string }> {
    if (!this.client || !this.bucket || !this.publicUrl) {
      // no-op: devuelve placeholder para dev sin R2
      return {
        signedUrl: `https://placeholder.r2.dev/upload?key=${encodeURIComponent(key)}`,
        publicUrl: `https://placeholder.r2.dev/${key}`,
      };
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return { signedUrl, publicUrl: `${this.publicUrl.replace(/\/$/, '')}/${key}` };
  }
}
