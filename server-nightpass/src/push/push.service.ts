import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { haversineMeters } from '../common/geo';
import { SubscribeDto } from './dto/subscribe.dto';
import type { EventAudience } from './dto/notify-event.dto';

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

/**
 * urgency 'high' evita que Android (Doze/batching) agrupe y retrase la
 * entrega — llega al instante. TTL 24h: si el device está offline, el push
 * service la guarda y la entrega al reconectar (dentro de ese plazo).
 */
const SEND_OPTIONS = { urgency: 'high', TTL: 60 * 60 * 24 } as const;

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
            SEND_OPTIONS,
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
          SEND_OPTIONS,
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
            SEND_OPTIONS,
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

  /**
   * Notifica a una muestra ALEATORIA de personas que creemos están en el
   * evento ahora: por su ubicación reciente cerca del venue (GEO) y/o porque
   * escanearon su pase hace poco (CHECKIN). Solo cuentan quienes tienen push
   * activado. `max` topa cuántas reciben.
   */
  async notifyEventAudience(
    eventId: string,
    opts: { title: string; body: string; max: number; audience: EventAudience; url?: string },
  ): Promise<{ present: number; eligible: number; targeted: number; delivered: number }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        externalVenueLat: true,
        externalVenueLng: true,
        venue: { select: { latitude: true, longitude: true, geofenceRadiusM: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const wantGeo = opts.audience === 'GEO' || opts.audience === 'BOTH';
    const wantCheckin = opts.audience === 'CHECKIN' || opts.audience === 'BOTH';
    const present = new Set<string>();

    // CHECK-IN: pases escaneados en las últimas 8h para este evento.
    if (wantCheckin) {
      const since = new Date(Date.now() - 8 * 60 * 60_000);
      const passes = await this.prisma.pass.findMany({
        where: { eventId, usedAt: { gte: since } },
        select: { userId: true },
      });
      passes.forEach((p) => present.add(p.userId));
    }

    // GEO: pings dentro del radio del venue en las últimas 3h.
    if (wantGeo) {
      const lat = event.venue?.latitude ?? event.externalVenueLat;
      const lng = event.venue?.longitude ?? event.externalVenueLng;
      const radius = event.venue?.geofenceRadiusM ?? 150;
      if (lat != null && lng != null && radius > 0) {
        const cutoff = new Date(Date.now() - 3 * 60 * 60_000);
        const padded = radius * 1.05;
        const dLat = padded / 111_320;
        const cosLat = Math.cos((lat * Math.PI) / 180);
        const dLng = cosLat === 0 ? padded : padded / (111_320 * Math.abs(cosLat));
        const pings = await this.prisma.locationPing.findMany({
          where: {
            createdAt: { gte: cutoff },
            latitude: { gte: lat - dLat, lte: lat + dLat },
            longitude: { gte: lng - dLng, lte: lng + dLng },
          },
          select: { userId: true, latitude: true, longitude: true },
        });
        for (const ping of pings) {
          if (haversineMeters(ping.latitude, ping.longitude, lat, lng) <= radius) {
            present.add(ping.userId);
          }
        }
      }
    }

    const presentIds = Array.from(present);
    if (presentIds.length === 0) {
      return { present: 0, eligible: 0, targeted: 0, delivered: 0 };
    }

    // Solo quienes tienen push activado pueden recibir.
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: presentIds } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const eligible = subs.map((s) => s.userId);

    // Fisher-Yates: muestra aleatoria, tope `max`.
    for (let i = eligible.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    const targeted = eligible.slice(0, Math.max(1, opts.max));

    let delivered = 0;
    for (const userId of targeted) {
      delivered += await this.sendToUser(userId, {
        title: opts.title,
        body: opts.body,
        url: opts.url ?? `/app/evento/${eventId}`,
        tag: `event-${eventId}`,
      });
    }

    return {
      present: presentIds.length,
      eligible: eligible.length,
      targeted: targeted.length,
      delivered,
    };
  }
}
