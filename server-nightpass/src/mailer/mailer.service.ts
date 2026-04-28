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
    this.adminNotificationEmail =
      config.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? null;
    this.adminWebUrl =
      config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100';

    if (smtpUser && smtpPass) {
      this.from = `NightPass <${smtpUser}>`;
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log(`Mailer configurado con Gmail SMTP (${smtpUser})`);
    } else {
      this.from = 'NightPass <noreply@nightpass.app>';
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

  async sendStaffInvited(
    to: string,
    staffName: string,
    venueName: string,
    temporaryPassword?: string,
  ): Promise<void> {
    const loginUrl = `${this.adminWebUrl.replace(/\/$/, '')}/login`;
    const tpl = staffInvited({ staffName, venueName, loginEmail: to, loginUrl, temporaryPassword });
    await this.send(to, tpl);
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
