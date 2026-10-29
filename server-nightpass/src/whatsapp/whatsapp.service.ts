import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsappSendResult {
  ok: boolean;
  messageId?: string;
  skipped?: boolean;
  error?: string;
}

/** Un componente de plantilla (body params, botones, etc.). */
export interface TemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters?: Array<Record<string, unknown>>;
  sub_type?: string;
  index?: string;
}

/**
 * WhatsApp Cloud API (Meta) — envío de mensajes.
 *
 * Modo no-op: si faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID, no truena —
 * solo loguea (igual que MailerService sin SMTP). Así el backend corre en
 * dev/local sin credenciales y los flujos que lo usan no fallan.
 *
 * Dos tipos de mensaje:
 *  - PLANTILLA (`sendTemplate`): mensajes que INICIA el negocio (confirmación,
 *    recordatorio, OTP). Requieren plantilla aprobada por Meta. Es lo que se usa
 *    el 99% del tiempo.
 *  - TEXTO LIBRE (`sendText`): solo válido DENTRO de la ventana de 24h después
 *    de que el usuario te escribió. Fuera de eso Meta lo rechaza.
 *
 * Usa el `fetch` global de Node 20+ (sin SDK extra).
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string | null;
  private readonly phoneNumberId: string | null;
  private readonly apiVersion: string;
  private readonly defaultCountryCode: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('WHATSAPP_TOKEN') ?? null;
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? null;
    this.apiVersion = config.get<string>('WHATSAPP_API_VERSION') ?? 'v21.0';
    this.defaultCountryCode = config.get<string>('SMS_DEFAULT_COUNTRY_CODE') ?? '52';

    if (this.token && this.phoneNumberId) {
      this.logger.log('WhatsApp configurado: Meta Cloud API');
    } else {
      this.logger.warn(
        'WhatsApp en modo NO-OP (faltan WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID)',
      );
    }
  }

  isEnabled(): boolean {
    return this.token !== null && this.phoneNumberId !== null;
  }

  /**
   * Normaliza a E.164 SIN el '+' (Meta espera el número con país y sin '+').
   * 10 dígitos → antepone país por defecto (MX 52). Acepta '+', '00', espacios.
   */
  normalizePhone(raw: string): string | null {
    if (!raw) return null;
    let s = raw.trim().replace(/[\s\-().]/g, '');
    if (s.startsWith('00')) s = s.slice(2);
    if (s.startsWith('+')) s = s.slice(1);
    const digits = s.replace(/\D/g, '');
    if (digits.length === 10) return `${this.defaultCountryCode}${digits}`;
    if (digits.length >= 11) return digits;
    return null;
  }

  /**
   * Envía una plantilla aprobada. `params` son los valores de las variables
   * {{1}}, {{2}}… del cuerpo, en orden.
   */
  async sendTemplate(
    to: string,
    templateName: string,
    params: string[] = [],
    languageCode = 'es_MX',
  ): Promise<WhatsappSendResult> {
    const components: TemplateComponent[] =
      params.length > 0
        ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
        : [];

    return this.post(to, {
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length ? { components } : {}),
      },
    });
  }

  /** Texto libre — SOLO dentro de la ventana de 24h. */
  async sendText(to: string, body: string): Promise<WhatsappSendResult> {
    return this.post(to, { type: 'text', text: { body, preview_url: true } });
  }

  private async post(
    to: string,
    payload: Record<string, unknown>,
  ): Promise<WhatsappSendResult> {
    const phone = this.normalizePhone(to);
    if (!phone) {
      this.logger.warn(`Número inválido, no se envía WhatsApp: "${to}"`);
      return { ok: false, error: 'INVALID_PHONE' };
    }

    if (!this.isEnabled()) {
      this.logger.log(`[NO-OP whatsapp] → ${phone}: ${JSON.stringify(payload).slice(0, 120)}`);
      return { ok: true, skipped: true };
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, ...payload }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        const error = data.error?.message ?? `HTTP ${res.status}`;
        this.logger.error(`WhatsApp a ${phone} falló: ${error}`);
        return { ok: false, error };
      }
      return { ok: true, messageId: data.messages?.[0]?.id };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`WhatsApp a ${phone} error de red: ${error}`);
      return { ok: false, error };
    }
  }
}
