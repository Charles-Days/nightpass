import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Ruta del panel a la que lleva la notificación según el rol del destinatario. */
function urlForRole(role: Role): string {
  switch (role) {
    case Role.PROMOTER:
    case Role.PROMOTER_STAFF:
      return '/app/mi-organizador/solicitudes';
    case Role.RP:
      return '/rp-dashboard';
    case Role.VENUE_OWNER:
    case Role.VENUE_STAFF:
      return '/mi-local/eventos';
    case Role.ADMIN:
      return '/admin/rps';
    default:
      return '/dashboard';
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Lectura (campana del panel) ───────────────────────────────────────────

  async listForUser(userId: string, limit = 30) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return { items };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    // updateMany con guard de userId — un usuario solo marca lo suyo.
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true, updated: res.count };
  }

  // ── Emisión ───────────────────────────────────────────────────────────────

  /**
   * Crea una notificación por destinatario. `recipients` trae el rol de cada uno
   * para resolver la URL de destino. Best-effort: nunca lanza (solo loguea).
   */
  private async emit(
    recipients: Array<{ userId: string; role: Role }>,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    if (recipients.length === 0) return;
    const rows = recipients.map((r) => ({
      userId: r.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: urlForRole(r.role),
      data: payload.data,
    }));
    try {
      await this.prisma.notification.createMany({ data: rows });
    } catch (err) {
      this.logger.error(
        `No se pudieron crear notificaciones (${payload.type}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Notificación de ciclo de vida de una solicitud de pago en efectivo. Resuelve
   * la audiencia (RP asignado + organizador + dueño del local + admins) y crea
   * una notificación por cada uno. `excludeUserId` evita notificar al actor que
   * provocó el cambio (p.ej. el RP que confirma no se notifica a sí mismo).
   *
   * Best-effort y fire-and-forget desde el caller — nunca bloquea ni lanza.
   */
  async notifyPhysicalRequestEvent(
    requestId: string,
    type: NotificationType,
    opts: { excludeUserId?: string } = {},
  ): Promise<void> {
    try {
      const req = await this.prisma.physicalPaymentRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          quantity: true,
          amountCents: true,
          currency: true,
          contactPhone: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              city: true,
              state: true,
            },
          },
          event: {
            select: { id: true, title: true, venueId: true, promoterId: true },
          },
          tier: { select: { name: true } },
          assignedRp: { select: { userId: true } },
        },
      });
      if (!req) return;

      // ── Audiencia: junta userIds candidatos ──
      const candidateIds = new Set<string>();
      if (req.assignedRp?.userId) candidateIds.add(req.assignedRp.userId);

      if (req.event.promoterId) {
        const members = await this.prisma.promoterMember.findMany({
          where: { promoterId: req.event.promoterId },
          select: { userId: true },
        });
        members.forEach((m) => candidateIds.add(m.userId));
      }
      if (req.event.venueId) {
        const owners = await this.prisma.venueOwner.findMany({
          where: { venueId: req.event.venueId },
          select: { userId: true },
        });
        owners.forEach((o) => candidateIds.add(o.userId));
      }
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });
      admins.forEach((a) => candidateIds.add(a.id));

      if (opts.excludeUserId) candidateIds.delete(opts.excludeUserId);
      if (candidateIds.size === 0) return;

      // Resuelve rol de cada destinatario (para la URL de destino).
      const users = await this.prisma.user.findMany({
        where: { id: { in: [...candidateIds] } },
        select: { id: true, role: true },
      });
      const recipients = users.map((u) => ({ userId: u.id, role: u.role }));

      // ── Copy ──
      const customer = req.user?.name || req.user?.email || 'Un cliente';
      const qty = req.quantity;
      const pases = qty === 1 ? 'pase' : 'pases';
      const eventTitle = req.event.title;

      const COPY: Record<NotificationType, { title: string; body: string }> = {
        [NotificationType.PHYSICAL_REQUEST_CREATED]: {
          title: 'Nueva solicitud de boletos',
          body: `${customer} solicitó ${qty} ${pases} para ${eventTitle}.`,
        },
        [NotificationType.PHYSICAL_REQUEST_CONFIRMED]: {
          title: 'Solicitud confirmada',
          body: `Se confirmó el cobro de ${qty} ${pases} de ${customer} para ${eventTitle}.`,
        },
        [NotificationType.PHYSICAL_REQUEST_CANCELLED]: {
          title: 'Solicitud cancelada',
          body: `Se canceló la solicitud de ${qty} ${pases} de ${customer} para ${eventTitle}.`,
        },
        [NotificationType.PHYSICAL_REQUEST_EXPIRED]: {
          title: 'Solicitud expirada',
          body: `Expiró la solicitud de ${qty} ${pases} de ${customer} para ${eventTitle}.`,
        },
      };

      const data: Prisma.InputJsonValue = {
        requestId: req.id,
        eventId: req.event.id,
        eventTitle,
        tierName: req.tier.name,
        quantity: qty,
        amountCents: req.amountCents,
        currency: req.currency,
        status: req.status,
        customerName: req.user?.name ?? null,
        customerEmail: req.user?.email ?? null,
        customerPhone: req.user?.phone ?? req.contactPhone ?? null,
        contactPhone: req.contactPhone ?? null,
        customerCity: req.user?.city ?? null,
        customerState: req.user?.state ?? null,
      };

      await this.emit(recipients, { type, ...COPY[type], data });
    } catch (err) {
      this.logger.error(
        `notifyPhysicalRequestEvent(${type}) falló para ${requestId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
