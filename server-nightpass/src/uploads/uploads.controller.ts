import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Put,
  UseGuards,
  Param,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { extname, join, dirname, resolve, sep } from 'path';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';
import { SignUploadDto } from './dto/sign-upload.dto';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly storage: StorageService) {}

  @Post('sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.VENUE_OWNER,
    Role.VENUE_STAFF,
    Role.PROMOTER,
    Role.PROMOTER_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  async sign(@Body() dto: SignUploadDto, @CurrentUser() user: AuthUser) {
    const ext = (extname(dto.filename).toLowerCase() || '.jpg');
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Extensión no permitida');
    }
    const key = `${dto.kind}s/${user.id}/${randomBytes(8).toString('hex')}${ext}`;
    return this.storage.getSignedUploadUrl(key, dto.contentType);
  }

  @Put('local-put/*')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.VENUE_OWNER,
    Role.VENUE_STAFF,
    Role.PROMOTER,
    Role.PROMOTER_STAFF,
  )
  @HttpCode(HttpStatus.CREATED)
  async handleLocalPut(@Req() req: any, @Param() params: any) {
    if (this.storage.getDriver() !== 'local') {
      throw new ForbiddenException('Local upload is disabled');
    }

    const key: string | undefined = params['*'];
    if (!key) throw new BadRequestException('No key provided');

    // Path traversal defense — reject any attempt to escape the uploads dir
    if (
      key.includes('..') ||
      key.startsWith('/') ||
      key.startsWith('\\') ||
      key.includes('\0')
    ) {
      throw new BadRequestException('Invalid key');
    }
    const ext = extname(key).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Extensión no permitida');
    }

    // Size guard via Content-Length
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      throw new BadRequestException('Content-Length requerido');
    }
    if (contentLength > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Archivo demasiado grande');
    }

    const baseDir = resolve(process.cwd(), this.storage.getLocalPath());
    const filePath = resolve(baseDir, key);
    // Confirmar que filePath sigue contenido en baseDir tras resolver
    if (!filePath.startsWith(baseDir + sep) && filePath !== baseDir) {
      throw new BadRequestException('Invalid key');
    }

    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      await pipeline(req.raw, createWriteStream(filePath));
      return { success: true };
    } catch (err) {
      this.logger.error(`Error saving local file: ${err instanceof Error ? err.message : err}`);
      throw new BadRequestException('Error saving file');
    }
  }
}
