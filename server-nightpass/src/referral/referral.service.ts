import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { EventStatus, LoyaltyEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { POINTS } from '../loyalty/loyalty.constants';

// Sin caracteres ambiguos (0/O/1/I/L) para que el código se pueda dictar.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** Código + stats del usuario. Genera el código la 1ª vez que se consulta. */
  async getMyReferral(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const code = user.referralCode ?? (await this.assignCode(userId));

    const [referredCount, agg] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.loyaltyEvent.aggregate({
        where: {
          userId,
          type: {
            in: [
              LoyaltyEventType.REFERRAL_VISIT,
              LoyaltyEventType.REFERRAL_SIGNUP,
            ],
          },
        },
        _sum: { points: true },
      }),
    ]);

    return { code, referredCount, pointsEarned: agg._sum.points ?? 0 };
  }

  /** Público: alguien abrió un link de invitación. Acredita al dueño del código.
   *  Si vino por un link de evento (eventId válido), vale el doble. */
  async recordVisit(code: string, visitorId: string, eventId?: string) {
    if (!visitorId) return { ok: false };
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrer) return { ok: false };
    const eventScoped = await this.isPublishedEvent(eventId);
    await this.loyalty.awardReferralVisit({
      referrerId: referrer.id,
      visitorId,
      points: eventScoped ? POINTS.REFERRAL_VISIT_EVENT : POINTS.REFERRAL_VISIT,
      eventId: eventScoped ? eventId : undefined,
    });
    return { ok: true };
  }

  /** El invitado (autenticado) reclama su atribución tras registrarse. Si vino por
   *  un link de evento, el referidor gana el doble. */
  async claim(userId: string, code: string, eventId?: string) {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrer) throw new NotFoundException('Código de invitación inválido');
    if (referrer.id === userId) {
      throw new BadRequestException('No puedes usar tu propio link');
    }

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });
    if (!me) throw new NotFoundException('Usuario no encontrado');
    // Ya tiene referidor: la atribución es 1 sola vez, no se sobreescribe.
    if (me.referredById) return { ok: true, alreadyClaimed: true };

    const eventScoped = await this.isPublishedEvent(eventId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });
    await this.loyalty.awardReferralSignup({
      referrerId: referrer.id,
      referredUserId: userId,
      points: eventScoped
        ? POINTS.REFERRAL_SIGNUP_EVENT
        : POINTS.REFERRAL_SIGNUP,
    });
    return { ok: true };
  }

  /** ¿El eventId apunta a un evento publicado? (valida el "scope por evento"). */
  private async isPublishedEvent(eventId?: string): Promise<boolean> {
    if (!eventId) return false;
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    return event?.status === EventStatus.PUBLISHED;
  }

  private generateCode(): string {
    let out = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
      out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return out;
  }

  /** Asigna un código único al usuario, reintentando ante colisión. */
  private async assignCode(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = this.generateCode();
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
        });
        return code;
      } catch (err) {
        const collision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002';
        if (collision) continue;
        throw err;
      }
    }
    throw new Error('No se pudo generar un código de referido único');
  }
}
