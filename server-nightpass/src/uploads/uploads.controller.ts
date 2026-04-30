import { 
  Body, 
  Controller, 
  HttpCode, 
  HttpStatus, 
  Post, 
  Put, 
  UseGuards, 
  Param, 
  Req, 
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { extname, join, dirname } from 'path';
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

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  @HttpCode(HttpStatus.OK)
  async sign(@Body() dto: SignUploadDto, @CurrentUser() user: AuthUser) {
    const ext = extname(dto.filename).toLowerCase() || '.jpg';
    const key = `${dto.kind}s/${user.id}/${randomBytes(8).toString('hex')}${ext}`;
    return this.storage.getSignedUploadUrl(key, dto.contentType);
  }

  @Put('local-put/*')
  @HttpCode(HttpStatus.CREATED)
  async handleLocalPut(@Req() req: any, @Param() params: any) {
    if (this.storage.getDriver() !== 'local') {
      throw new ForbiddenException('Local upload is disabled');
    }

    // El path está en params['*'] gracias al wildcard de Nest con Fastify
    const key = params['*'];
    if (!key) throw new BadRequestException('No key provided');

    const filePath = join(process.cwd(), this.storage.getLocalPath(), key);
    
    // Asegurar que el directorio existe
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      // Fastify raw body stream
      await pipeline(req.raw, createWriteStream(filePath));
      return { success: true };
    } catch (err) {
      console.error('Error saving local file:', err);
      throw new BadRequestException('Error saving file');
    }
  }
}
