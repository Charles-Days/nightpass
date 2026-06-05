import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { PushService } from './push.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

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
}
