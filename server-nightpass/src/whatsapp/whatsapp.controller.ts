import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhatsappService } from './whatsapp.service';
import { SendTestDto } from './dto/send-test.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  /**
   * Envío de prueba (solo ADMIN) para verificar la integración apenas se ponen
   * las credenciales de Meta. Con `templateName` manda plantilla; con `text`,
   * texto libre (solo válido en ventana de 24h).
   */
  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async test(@Body() dto: SendTestDto) {
    const result = dto.templateName
      ? await this.whatsapp.sendTemplate(
          dto.to,
          dto.templateName,
          dto.params ?? [],
          dto.languageCode ?? 'es_MX',
        )
      : await this.whatsapp.sendText(dto.to, dto.text ?? 'Prueba NightPass');
    return result;
  }
}
