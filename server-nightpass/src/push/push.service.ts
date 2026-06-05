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

/** Íconos por defecto (resueltos contra el origen del cliente por el SW). */
const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/badge-96.png'; // monocromo: el status bar lo tinta

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  /** Serializa el payload añadiendo icon/badge por defecto si faltan. */
  private buildBody(payload: PushPayload): string {
    return JSON.stringify({ icon: DEFAULT_ICON, badge: DEFAULT_BADGE, ...payload });
  }

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

    const body = this.buildBody(payload);
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

  /**
   * Prueba con diagnóstico: cuántas suscripciones tiene el usuario y, si el
   * envío falla, el statusCode/cuerpo que devolvió el push service. Sirve para
   * distinguir "no hay subs en la BD" de "claves VAPID no coinciden" (403/401).
   */
  async sendTestVerbose(userId: string): Promise<{
    enabled: boolean;
    subscriptions: number;
    delivered: number;
    failures: { statusCode?: number; reason: string }[];
  }> {
    if (!this.enabled) {
      return { enabled: false, subscriptions: 0, delivered: 0, failures: [] };
    }

    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const body = this.buildBody({
      title: 'NightPass 🎉',
      body: 'Notificaciones activadas. Te avisaremos de lo importante.',
      url: '/dashboard',
      tag: 'np-test',
    });

    let delivered = 0;
    const failures: { statusCode?: number; reason: string }[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        delivered += 1;
      } catch (err) {
        const e = err as { statusCode?: number; body?: string };
        failures.push({
          statusCode: e.statusCode,
          reason: String(e.body ?? err).slice(0, 200),
        });
      }
    }

    return { enabled: true, subscriptions: subs.length, delivered, failures };
  }

  /**
   * Difunde una notificación a TODAS las suscripciones (broadcast admin).
   * Limpia endpoints muertos. Devuelve recuento para feedback en el panel.
   */
  async sendToAll(
    payload: PushPayload,
  ): Promise<{ subscriptions: number; delivered: number }> {
    if (!this.enabled) return { subscriptions: 0, delivered: 0 };

    const subs = await this.prisma.pushSubscription.findMany();
    if (subs.length === 0) return { subscriptions: 0, delivered: 0 };

    const body = this.buildBody(payload);
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
              `Broadcast: fallo a ${sub.endpoint.slice(0, 40)}…: ${String(err)}`,
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

    return { subscriptions: subs.length, delivered };
  }
}
