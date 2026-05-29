import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

/** Payload que recibe el service worker en el evento `push`. */
export interface PushPayload {
  title: string;
  body: string;
  /** URL a abrir al hacer click (default '/'). */
  url?: string;
  icon?: string;
  badge?: string;
  /** Agrupa/colapsa notificaciones con el mismo tag. */
  tag?: string;
  /** Datos extra para el SW. */
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:noreply@nightpass.mx';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log('Web Push configurado (VAPID activo).');
    } else {
      this.logger.warn(
        'Web Push en modo no-op: define VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY para enviar notificaciones.',
      );
    }
  }

  /** Registra (o refresca) la suscripción del navegador para un usuario. */
  async subscribe(userId: string, dto: SubscribeDto, userAgent?: string) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
    });
    return { ok: true };
  }

  /** Elimina una suscripción por endpoint (logout / opt-out). */
  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true };
  }

  /**
   * Envía una notificación a todas las suscripciones activas de un usuario.
   * Las suscripciones muertas (404/410) se borran solas. Nunca lanza:
   * los errores se loguean (fire-and-forget desde el caller).
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.enabled) return 0;

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return 0;

    const body = JSON.stringify(payload);
    let delivered = 0;
    const deadEndpoints: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
          delivered += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            this.logger.warn(
              `Fallo enviando push a ${sub.endpoint.slice(0, 40)}…: ${String(err)}`,
            );
          }
        }
      }),
    );

    if (deadEndpoints.length > 0) {
      await this.prisma.pushSubscription
        .deleteMany({ where: { endpoint: { in: deadEndpoints } } })
        .catch(() => undefined);
    }

    return delivered;
  }

  /** Notificación de prueba contra el propio usuario. */
  async sendTest(userId: string): Promise<number> {
    return this.sendToUser(userId, {
      title: 'NightPass 🎉',
      body: 'Notificaciones activadas. Te avisaremos de lo importante.',
      url: '/dashboard',
      tag: 'np-test',
    });
  }
}
