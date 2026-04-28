import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { R2Service } from '../storage/r2.service';
import { SignUploadDto } from './dto/sign-upload.dto';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
export class UploadsController {
  constructor(private readonly r2: R2Service) {}

  @Post('sign')
  @HttpCode(HttpStatus.OK)
  async sign(@Body() dto: SignUploadDto, @CurrentUser() user: AuthUser) {
    const ext = extname(dto.filename).toLowerCase() || '.jpg';
    const key = `${dto.kind}s/${user.id}/${randomBytes(8).toString('hex')}${ext}`;
    return this.r2.getSignedUploadUrl(key, dto.contentType);
  }
}
