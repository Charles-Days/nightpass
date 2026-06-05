import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { PushService } from './push.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { BroadcastDto } from './dto/broadcast.dto';
import { NotifyEventDto } from './dto/notify-event.dto';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(
    @Body() dto: SubscribeDto,
    @CurrentUser() user: AuthUser,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.push.subscribe(user.id, dto, userAgent);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.push.unsubscribe(dto.endpoint);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async test(@CurrentUser() user: AuthUser) {
    // Devuelve diagnóstico (subscriptions/failures) para depurar delivered:0.
    const result = await this.push.sendTestVerbose(user.id);
    return { ok: true, ...result };
  }

  /** Difunde una notificación a TODOS los suscriptores. Solo ADMIN. */
  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async broadcast(@Body() dto: BroadcastDto) {
    const result = await this.push.sendToAll({
      title: dto.title,
      body: dto.body,
      url: dto.url ?? '/',
      tag: 'np-broadcast',
    });
    return { ok: true, ...result };
  }

  /**
   * Notifica a una muestra aleatoria de presentes en un evento (geo/check-in).
   * Solo ADMIN.
   */
  @Post('event/:eventId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async notifyEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: NotifyEventDto,
  ) {
    const result = await this.push.notifyEventAudience(eventId, {
      title: dto.title,
      body: dto.body,
      max: dto.max,
      audience: dto.audience,
      url: dto.url,
    });
    return { ok: true, ...result };
  }
}
