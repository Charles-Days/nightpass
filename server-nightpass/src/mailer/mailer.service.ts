import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  applicationApproved,
  applicationReceivedToAdmin,
  applicationReceivedToApplicant,
  applicationRejected,
  staffInvited,
} from './templates/application-emails';
import {
  promoterApplicationApproved,
  promoterApplicationReceivedToAdmin,
  promoterApplicationReceivedToApplicant,
  promoterApplicationRejected,
} from './templates/promoter-application-emails';
import {
  customerWelcome,
  passwordReset,
  passwordChanged,
} from './templates/auth-emails';
import {
  venueSuspended,
  venueReactivated,
  staffRevoked,
} from './templates/venue-lifecycle-emails';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly adminNotificationEmail: string | null;
  private readonly adminWebUrl: string;

  constructor(config: ConfigService) {
    const smtpUser = config.get<string>('SMTP_USER');
    const smtpPass = config.get<string>('SMTP_PASS');
    const smtpHost = config.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
    const smtpPort = Number(config.get<string>('SMTP_PORT') ?? 587);
    const smtpSecure = config.get<string>('SMTP_SECURE') === 'true' || smtpPort === 465;
    const smtpFrom = config.get<string>('SMTP_FROM');
    this.adminNotificationEmail =
      config.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? null;
    this.adminWebUrl =
      config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100';

    if (smtpUser && smtpPass) {
      this.from = smtpFrom ?? `NightPass <${smtpUser}>`;
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log(`Mailer configurado con SMTP ${smtpHost}:${smtpPort} (${smtpUser})`);
    } else {
      this.from = 'NightPass <noreply@nightpass.mx>';
      this.transporter = null;
      this.logger.warn(
        'Mailer en modo no-op: define SMTP_USER y SMTP_PASS para enviar correos reales.',
      );
    }
  }

  async sendApplicationReceivedToApplicant(
    to: string,
    applicantName: string,
    venueName: string,
  ): Promise<void> {
    const tpl = applicationReceivedToApplicant({ applicantName, venueName });
    await this.send(to, tpl);
  }

  async sendApplicationReceivedToAdmin(
    applicationId: string,
    applicantName: string,
    applicantEmail: string,
    venueName: string,
  ): Promise<void> {
    if (!this.adminNotificationEmail) {
      this.logger.warn(
        'ADMIN_NOTIFICATION_EMAIL no configurado, no se envía notificación al admin.',
      );
      return;
    }
    const tpl = applicationReceivedToAdmin({
      applicationId,
      applicantName,
      applicantEmail,
      venueName,
      adminWebUrl: this.adminWebUrl,
    });
    await this.send(this.adminNotificationEmail, tpl);
  }

  async sendApplicationApproved(
    to: string,
    applicantName: string,
    venueName: string,
    temporaryPassword: string,
    isExistingUser: boolean,
  ): Promise<void> {
    const loginUrl = `${this.adminWebUrl.replace(/\/$/, '')}/login`;
    const tpl = applicationApproved({
      applicantName,
      venueName,
      loginUrl,
      temporaryPassword,
      isExistingUser,
      loginEmail: to,
    });
    await this.send(to, tpl);
  }

  async sendApplicationRejected(
    to: string,
    applicantName: string,
    venueName: string,
    reason?: string,
  ): Promise<void> {
    const tpl = applicationRejected({ applicantName, venueName, reason });
    await this.send(to, tpl);
  }

  async sendPromoterApplicationReceivedToApplicant(
    to: string,
    applicantName: string,
    promoterName: string,
  ): Promise<void> {
    const tpl = promoterApplicationReceivedToApplicant({ applicantName, promoterName });
    await this.send(to, tpl);
  }

  async sendPromoterApplicationReceivedToAdmin(
    applicationId: string,
    applicantName: string,
    applicantEmail: string,
    promoterName: string,
  ): Promise<void> {
    if (!this.adminNotificationEmail) {
      this.logger.warn(
        'ADMIN_NOTIFICATION_EMAIL no configurado, no se envía notificación al admin.',
      );
      return;
    }
    const tpl = promoterApplicationReceivedToAdmin({
      applicationId,
      applicantName,
      applicantEmail,
      promoterName,
      adminWebUrl: this.adminWebUrl,
    });
    await this.send(this.adminNotificationEmail, tpl);
  }

  async sendPromoterApplicationApproved(
    to: string,
    applicantName: string,
    promoterName: string,
    temporaryPassword: string,
    isExistingUser: boolean,
  ): Promise<void> {
    const loginUrl = `${this.adminWebUrl.replace(/\/$/, '')}/login`;
    const tpl = promoterApplicationApproved({
      applicantName,
      promoterName,
      loginUrl,
      temporaryPassword,
      isExistingUser,
      loginEmail: to,
    });
    await this.send(to, tpl);
  }

  async sendPromoterApplicationRejected(
    to: string,
    applicantName: string,
    promoterName: string,
    reason?: string,
  ): Promise<void> {
    const tpl = promoterApplicationRejected({ applicantName, promoterName, reason });
    await this.send(to, tpl);
  }

  async sendStaffInvited(
    to: string,
    staffName: string,
    venueName: string,
    temporaryPassword?: string,
    staffRole?: 'MANAGER' | 'SCANNER',
  ): Promise<void> {
    const loginUrl = `${this.adminWebUrl.replace(/\/$/, '')}/login`;
    const tpl = staffInvited({ staffName, venueName, loginEmail: to, loginUrl, temporaryPassword, staffRole });
    await this.send(to, tpl);
  }

  async sendCustomerWelcome(to: string, name: string): Promise<void> {
    const appUrl = `${this.adminWebUrl.replace(/\/$/, '')}/app`;
    const tpl = customerWelcome({ name, email: to, appUrl });
    await this.send(to, tpl);
  }

  async sendPasswordReset(
    to: string,
    name: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const tpl = passwordReset({ name, resetUrl, expiresInMinutes });
    await this.send(to, tpl);
  }

  async sendPasswordChanged(to: string, name: string): Promise<void> {
    const tpl = passwordChanged({ name });
    await this.send(to, tpl);
  }

  async sendVenueSuspended(
    to: string,
    ownerName: string,
    venueName: string,
    reason?: string,
  ): Promise<void> {
    const tpl = venueSuspended({ ownerName, venueName, reason });
    await this.send(to, tpl);
  }

  async sendVenueReactivated(
    to: string,
    ownerName: string,
    venueName: string,
  ): Promise<void> {
    const loginUrl = `${this.adminWebUrl.replace(/\/$/, '')}/login`;
    const tpl = venueReactivated({ ownerName, venueName, loginUrl });
    await this.send(to, tpl);
  }

  async sendStaffRevoked(
    to: string,
    staffName: string,
    venueName: string,
  ): Promise<void> {
    const tpl = staffRevoked({ staffName, venueName });
    await this.send(to, tpl);
  }

  /** Aviso ligero — usuario existente con cuenta panel al que se le suma
   *  un nuevo local como dueño. No reemplaza credenciales. */
  async sendVenueOwnerAssigned(
    to: string,
    name: string,
    venueName: string,
  ): Promise<void> {
    const loginUrl = `${this.adminWebUrl.replace(/\/$/, '')}/login`;
    await this.send(to, {
      subject: `Ahora gestionas ${venueName} en NightPass`,
      html: `<p>Hola ${name},</p><p>Te asignamos como dueño de <strong>${venueName}</strong> en NightPass. Entra con tu cuenta de siempre para empezar a gestionarlo.</p><p><a href="${loginUrl}">${loginUrl}</a></p>`,
      text: `Hola ${name},\n\nTe asignamos como dueño de "${venueName}" en NightPass. Entra al panel: ${loginUrl}\n\n— Equipo NightPass`,
    });
  }

  private async send(
    to: string,
    tpl: { subject: string; html: string; text: string },
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[mail no-op] to=${to} subject="${tpl.subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      this.logger.log(`Correo enviado a ${to}: "${tpl.subject}"`);
    } catch (err) {
      this.logger.error(
        `Falló envío de correo a ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
