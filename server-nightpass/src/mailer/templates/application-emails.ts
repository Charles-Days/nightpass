import {
  renderLayout,
  renderButton,
  renderCredentials,
  renderDivider,
  renderEyebrow,
  escapeHtml,
} from './layout';

/* ─────────────────────────────────────────
   1. Solicitud recibida → al solicitante
───────────────────────────────────────── */

export interface ReceivedToApplicantInput {
  applicantName: string;
  venueName: string;
}

export function applicationReceivedToApplicant(input: ReceivedToApplicantInput) {
  const { applicantName, venueName } = input;
  return {
    subject: `Recibimos tu solicitud para ${venueName} ✓`,
    html: renderLayout({
      title: 'Solicitud recibida — NightPass',
      preheader: `Tu solicitud para ${venueName} está en revisión. Te avisaremos pronto.`,
      bodyHtml: `
        ${renderEyebrow('Solicitud recibida')}
        <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em;">
          Hola, ${escapeHtml(applicantName)} 👋
        </h1>
        <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.7;">
          Recibimos tu solicitud para registrar
          <strong style="color:#e4e4e7;">${escapeHtml(venueName)}</strong>
          en NightPass. Nuestro equipo la revisará en los próximos días.
        </p>

        ${renderDivider()}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
          <tr>
            <td style="width:40px;vertical-align:top;padding-top:2px;">
              <div style="width:28px;height:28px;border-radius:50%;background:rgba(168,85,247,0.15);text-align:center;line-height:28px;font-size:14px;">⏳</div>
            </td>
            <td style="vertical-align:top;padding-left:14px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#e4e4e7;">En revisión</p>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Tu solicitud está en la cola de revisión del equipo NightPass.</p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
          <tr>
            <td style="width:40px;vertical-align:top;padding-top:2px;">
              <div style="width:28px;height:28px;border-radius:50%;background:rgba(168,85,247,0.15);text-align:center;line-height:28px;font-size:14px;">📬</div>
            </td>
            <td style="vertical-align:top;padding-left:14px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#e4e4e7;">Te avisamos por correo</p>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Cuando haya una respuesta, te llegará a esta misma dirección. No necesitas hacer nada.</p>
            </td>
          </tr>
        </table>

        ${renderDivider()}

        <p style="margin:0;font-size:13px;color:#52525b;text-align:center;">
          ¿Tienes dudas? Escríbenos a
          <a href="mailto:hola@nightpass.app" style="color:#a855f7;text-decoration:none;">hola@nightpass.app</a>
        </p>
      `,
    }),
    text: `Hola ${applicantName},\n\nRecibimos tu solicitud para registrar "${venueName}" en NightPass. Nuestro equipo la revisará en los próximos días y te avisaremos por este correo.\n\nNo necesitas hacer nada por ahora.\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   2. Nueva solicitud → al admin
───────────────────────────────────────── */

export interface ReceivedToAdminInput {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  venueName: string;
  adminWebUrl: string;
}

export function applicationReceivedToAdmin(input: ReceivedToAdminInput) {
  const { applicationId, applicantName, applicantEmail, venueName, adminWebUrl } = input;
  const link = `${adminWebUrl.replace(/\/$/, '')}/admin/solicitudes/${applicationId}`;
  return {
    subject: `Nueva solicitud de local: ${venueName}`,
    html: renderLayout({
      title: 'Nueva solicitud — NightPass Admin',
      preheader: `${applicantName} quiere registrar "${venueName}" en NightPass.`,
      bodyHtml: `
        ${renderEyebrow('Solicitud pendiente')}
        <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em;">
          Nueva solicitud de local
        </h1>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#a855f7;">Local</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${escapeHtml(venueName)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid rgba(255,255,255,0.07);padding-top:16px;padding-bottom:16px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#a855f7;">Solicitante</p>
                    <p style="margin:0;font-size:15px;color:#e4e4e7;">${escapeHtml(applicantName)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid rgba(255,255,255,0.07);padding-top:16px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#a855f7;">Email de contacto</p>
                    <p style="margin:0;font-size:15px;color:#e4e4e7;">
                      <a href="mailto:${escapeHtml(applicantEmail)}" style="color:#a855f7;text-decoration:none;">${escapeHtml(applicantEmail)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${renderButton(link, 'Revisar solicitud')}

        ${renderDivider()}

        <p style="margin:0;font-size:12px;color:#52525b;text-align:center;word-break:break-all;">
          <a href="${escapeHtml(link)}" style="color:#71717a;text-decoration:none;">${escapeHtml(link)}</a>
        </p>
      `,
    }),
    text: `Nueva solicitud pendiente.\n\nLocal: ${venueName}\nSolicitante: ${applicantName} (${applicantEmail})\n\nRevisar: ${link}\n\n— NightPass`,
  };
}

/* ─────────────────────────────────────────
   3. Solicitud aprobada → al solicitante
───────────────────────────────────────── */

export interface ApprovedInput {
  applicantName: string;
  venueName: string;
  loginUrl: string;
  loginEmail: string;
  temporaryPassword: string;
  isExistingUser: boolean;
}

export function applicationApproved(input: ApprovedInput) {
  const { applicantName, venueName, loginUrl, loginEmail, temporaryPassword, isExistingUser } = input;

  const existingUserNote = isExistingUser
    ? '⚠️ Esta contraseña reemplaza la que usabas en la app móvil. Cámbiala desde tu perfil al entrar.'
    : undefined;

  return {
    subject: `🎉 ¡${venueName} fue aprobado en NightPass!`,
    html: renderLayout({
      title: `${venueName} aprobado — NightPass`,
      preheader: `¡Tu local ${venueName} ya está activo! Aquí están tus credenciales de acceso al panel.`,
      bodyHtml: `
        ${renderEyebrow('¡Solicitud aprobada!')}
        <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em;">
          ¡Bienvenido a NightPass,<br>${escapeHtml(applicantName)}!
        </h1>
        <p style="margin:0 0 28px;font-size:15px;color:#a1a1aa;line-height:1.7;">
          Tu local <strong style="color:#e4e4e7;">${escapeHtml(venueName)}</strong> ya está activo en la plataforma.
          Te creamos una cuenta de panel para que lo gestiones: publica eventos, invita a tu equipo y más.
        </p>

        ${renderCredentials(loginEmail, temporaryPassword, existingUserNote)}

        <p style="margin:16px 0 0;font-size:13px;color:#71717a;text-align:center;line-height:1.6;">
          Al entrar, el sistema te pedirá que cambies esta contraseña.
        </p>

        ${renderButton(loginUrl, 'Entrar al panel')}

        ${renderDivider()}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:50%;padding-right:8px;vertical-align:top;">
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 18px;">
                <p style="margin:0 0 6px;font-size:14px;">🎟️</p>
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#e4e4e7;">Crea eventos</p>
                <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">Publica y gestiona todos los eventos de tu local.</p>
              </div>
            </td>
            <td style="width:50%;padding-left:8px;vertical-align:top;">
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 18px;">
                <p style="margin:0 0 6px;font-size:14px;">👥</p>
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#e4e4e7;">Invita a tu equipo</p>
                <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">Añade staff para gestionar el local contigo.</p>
              </div>
            </td>
          </tr>
        </table>
      `,
    }),
    text: `¡Enhorabuena, ${applicantName}!\n\n${venueName} ya está activo en NightPass.\n\nTus credenciales:\nEmail: ${loginEmail}\nContraseña temporal: ${temporaryPassword}\n\nEntra al panel: ${loginUrl}\n\nAl entrar, el sistema te pedirá que cambies la contraseña.\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   4. Invitación al equipo → al staff
───────────────────────────────────────── */

export interface StaffInvitedInput {
  staffName: string;
  venueName: string;
  loginEmail: string;
  loginUrl: string;
  temporaryPassword?: string;
}

export function staffInvited(input: StaffInvitedInput) {
  const { staffName, venueName, loginEmail, loginUrl, temporaryPassword } = input;

  const credsHtml = temporaryPassword
    ? renderCredentials(loginEmail, temporaryPassword)
    : `<div style="margin:24px 0;padding:20px 24px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);border-radius:12px;">
         <p style="margin:0;font-size:14px;color:#e4e4e7;">✓ Ya tienes acceso con tu cuenta existente en <strong>${escapeHtml(loginEmail)}</strong>.</p>
       </div>`;

  const credsText = temporaryPassword
    ? `\n\nEmail: ${loginEmail}\nContraseña temporal: ${temporaryPassword}`
    : `\n\nYa tienes acceso con tu cuenta existente (${loginEmail}).`;

  return {
    subject: `Te invitaron al equipo de ${venueName} 🎉`,
    html: renderLayout({
      title: `Invitación al equipo — NightPass`,
      preheader: `Ahora formas parte del equipo de ${venueName} en NightPass.`,
      bodyHtml: `
        ${renderEyebrow('Invitación al equipo')}
        <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em;">
          Hola, ${escapeHtml(staffName)} 👋
        </h1>
        <p style="margin:0 0 8px;font-size:15px;color:#a1a1aa;line-height:1.7;">
          Te invitaron a formar parte del equipo de
        </p>
        <p style="margin:0 0 28px;font-size:22px;font-weight:700;color:#fff;">
          ${escapeHtml(venueName)}
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
          Desde el panel podrás gestionar eventos, escanear QRs en la entrada y más —
          según el rol que te asignó el dueño del local.
        </p>

        ${credsHtml}

        ${renderButton(loginUrl, 'Entrar al panel')}
      `,
    }),
    text: `Hola ${staffName},\n\nTe invitaron al equipo de "${venueName}" en NightPass.${credsText}\n\nEntra al panel: ${loginUrl}\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   5. Solicitud rechazada → al solicitante
───────────────────────────────────────── */

export interface RejectedInput {
  applicantName: string;
  venueName: string;
  reason?: string;
}

export function applicationRejected(input: RejectedInput) {
  const { applicantName, venueName, reason } = input;

  const reasonHtml = reason
    ? `<div style="margin:24px 0;border-left:3px solid rgba(239,68,68,0.6);background:rgba(239,68,68,0.06);border-radius:0 10px 10px 0;padding:16px 20px;">
         <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#ef4444;">Motivo</p>
         <p style="margin:0;font-size:14px;color:#e4e4e7;line-height:1.6;">${escapeHtml(reason)}</p>
       </div>`
    : '';

  const reasonText = reason ? `\n\nMotivo: ${reason}` : '';

  return {
    subject: `Solicitud de ${venueName} — respuesta de NightPass`,
    html: renderLayout({
      title: 'Solicitud no aprobada — NightPass',
      preheader: `Tu solicitud para ${venueName} no fue aprobada en esta ocasión.`,
      bodyHtml: `
        ${renderEyebrow('Resultado de tu solicitud')}
        <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em;">
          Hola, ${escapeHtml(applicantName)}
        </h1>
        <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.7;">
          Gracias por tu interés en NightPass. Lamentamos informarte que tu solicitud para
          <strong style="color:#e4e4e7;">${escapeHtml(venueName)}</strong>
          no fue aprobada en esta ocasión.
        </p>

        ${reasonHtml}

        ${renderDivider()}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
          <tr>
            <td style="width:36px;vertical-align:top;padding-top:2px;">
              <div style="width:28px;height:28px;border-radius:50%;background:rgba(168,85,247,0.12);text-align:center;line-height:28px;font-size:14px;">🔄</div>
            </td>
            <td style="vertical-align:top;padding-left:14px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#e4e4e7;">¿Puedes volver a aplicar?</p>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Sí — podrás enviar una nueva solicitud transcurridos 30 días. Si crees que hay un error, escríbenos.</p>
            </td>
          </tr>
        </table>

        ${renderDivider()}

        <p style="margin:0;font-size:13px;color:#52525b;text-align:center;">
          ¿Tienes dudas? Escríbenos a
          <a href="mailto:hola@nightpass.app" style="color:#a855f7;text-decoration:none;">hola@nightpass.app</a>
        </p>
      `,
    }),
    text: `Hola ${applicantName},\n\nGracias por tu interés. Lamentamos informarte que tu solicitud para "${venueName}" no fue aprobada en esta ocasión.${reasonText}\n\nPodrás volver a aplicar transcurridos 30 días.\n\n¿Tienes dudas? Escríbenos a hola@nightpass.app\n\n— Equipo NightPass`,
  };
}
