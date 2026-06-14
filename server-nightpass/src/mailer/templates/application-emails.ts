import {
  renderLayout,
  renderButton,
  renderCredentials,
  renderDivider,
  renderEyebrow,
  renderHeading,
  renderSubheading,
  renderParagraph,
  renderNumberedList,
  renderInfoBox,
  renderDataCard,
  renderFallbackUrl,
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
      eyebrowLabel: 'Solicitud recibida',
      bodyHtml: `
        ${renderEyebrow('En revisión')}
        ${renderHeading(`Hola, ${applicantName}.`)}
        ${renderParagraph(
          `Recibimos tu solicitud para registrar <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong> en NightPass. Nuestro equipo la revisará en los próximos días.`,
        )}
        ${renderNumberedList([
          {
            title: 'En revisión',
            body: 'Tu solicitud está en la cola del equipo NightPass.',
          },
          {
            title: 'Te avisamos por correo',
            body: 'Cuando haya una respuesta, te llegará a esta misma dirección. No necesitas hacer nada.',
          },
        ])}
      `,
    }),
    text: `Hola ${applicantName},\n\nRecibimos tu solicitud para registrar "${venueName}" en NightPass.\n\n01. En revisión — tu solicitud está en la cola del equipo NightPass.\n02. Te avisamos por correo — cuando haya una respuesta, te llegará a esta misma dirección. No necesitas hacer nada.\n\n— Equipo NightPass`,
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
      eyebrowLabel: 'Solicitud pendiente',
      bodyHtml: `
        ${renderEyebrow('Nueva solicitud')}
        ${renderHeading('Hay una solicitud por revisar.')}
        ${renderDataCard([
          { label: 'Local', value: venueName },
          { label: 'Solicitante', value: applicantName },
          {
            label: 'Email de contacto',
            value: `<a href="mailto:${escapeHtml(applicantEmail)}" style="color:#a855f7;text-decoration:none;">${escapeHtml(applicantEmail)}</a>`,
            isHtml: true,
          },
        ])}
        ${renderButton(link, 'Revisar solicitud')}
        ${renderFallbackUrl(link)}
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
    ? 'Esta contraseña reemplaza la que usabas en la app móvil. Cámbiala desde tu perfil al entrar.'
    : undefined;

  return {
    subject: `🎉 ¡${venueName} fue aprobado en NightPass!`,
    html: renderLayout({
      title: `${venueName} aprobado — NightPass`,
      preheader: `¡Tu local ${venueName} ya está activo! Aquí están tus credenciales de acceso al panel.`,
      eyebrowLabel: 'Solicitud aprobada · Acceso emitido',
      bodyHtml: `
        ${renderEyebrow('Solicitud aprobada')}
        ${renderHeading(`Bienvenido a NightPass, ${applicantName}.`)}
        ${renderParagraph(
          `Tu local <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong> ya está activo en la plataforma. Te creamos una cuenta de panel para que lo gestiones: publica eventos, invita a tu equipo y supervisa la operación.`,
        )}
        ${renderCredentials(loginEmail, temporaryPassword, existingUserNote)}
        <p style="margin:14px 0 0;font-size:13px;color:rgba(245,243,255,0.45);text-align:center;line-height:1.6;">Al entrar, el sistema te pedirá cambiar esta contraseña.</p>
        ${renderButton(loginUrl, 'Entrar al panel')}
        ${renderDivider()}
        ${renderSubheading('Qué puedes hacer ahora')}
        ${renderNumberedList([
          {
            title: 'Crea eventos',
            body: 'Publica y gestiona todos los eventos de tu local con sus tiers de precio.',
          },
          {
            title: 'Invita a tu equipo',
            body: 'Añade managers para gestionar contigo o staff para escanear en la puerta.',
          },
          {
            title: 'Supervisa la operación',
            body: 'Revisa en tiempo real pases vendidos y entradas escaneadas.',
          },
        ])}
      `,
    }),
    text: `¡Enhorabuena, ${applicantName}!\n\n${venueName} ya está activo en NightPass.\n\nTus credenciales:\nEmail: ${loginEmail}\nContraseña temporal: ${temporaryPassword}\n\nEntra al panel: ${loginUrl}\n\nAl entrar, el sistema te pedirá cambiar esta contraseña.\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   4. Invitación al equipo → al staff
───────────────────────────────────────── */

export type StaffRole = 'MANAGER' | 'SCANNER';

export interface StaffInvitedInput {
  staffName: string;
  venueName: string;
  loginEmail: string;
  loginUrl: string;
  temporaryPassword?: string;
  staffRole?: StaffRole;
}

interface StaffCopy {
  roleLabel: string;
  description: string;
  capabilities: Array<{ title: string; body: string }>;
}

const STAFF_COPY: Record<StaffRole, StaffCopy> = {
  MANAGER: {
    roleLabel: 'Manager',
    description:
      'Como manager tendrás acceso al panel para gestionar eventos, invitar staff y supervisar la operación del local.',
    capabilities: [
      {
        title: 'Gestiona eventos',
        body: 'Crea, edita y publica eventos del local con sus tiers de precio.',
      },
      {
        title: 'Invita staff',
        body: 'Añade más manos al equipo cuando lo necesites.',
      },
      {
        title: 'Supervisa la operación',
        body: 'Revisa en tiempo real pases vendidos y entradas escaneadas.',
      },
      {
        title: 'Sube contenido',
        body: 'Actualiza fotos del local y stories en vivo.',
      },
    ],
  },
  SCANNER: {
    roleLabel: 'Staff de entrada',
    description:
      'Como staff de entrada usarás la app móvil NightPass para escanear los QR de los pases en la puerta del local.',
    capabilities: [
      {
        title: 'Descarga la app NightPass',
        body: 'Inicia sesión en la app móvil con estas credenciales.',
      },
      {
        title: 'Escanea QR en la entrada',
        body: 'Valida pases con la cámara del celular.',
      },
      {
        title: 'Confirma acceso al instante',
        body: 'El sistema te dirá si el pase es válido en menos de un segundo.',
      },
      {
        title: 'Cuenta protegida',
        body: 'Cambia tu contraseña al primer ingreso para asegurar la cuenta.',
      },
    ],
  },
};

export function staffInvited(input: StaffInvitedInput) {
  const { staffName, venueName, loginEmail, loginUrl, temporaryPassword, staffRole = 'SCANNER' } = input;
  const copy = STAFF_COPY[staffRole];

  const credsHtml = temporaryPassword
    ? renderCredentials(loginEmail, temporaryPassword)
    : renderInfoBox({
        tone: 'neutral',
        bodyHtml: `Ya tienes acceso con tu cuenta existente en <strong style="color:#f5f3ff;">${escapeHtml(loginEmail)}</strong>.`,
      });

  const credsText = temporaryPassword
    ? `\n\nEmail: ${loginEmail}\nContraseña temporal: ${temporaryPassword}`
    : `\n\nYa tienes acceso con tu cuenta existente (${loginEmail}).`;

  const ctaLabel = staffRole === 'SCANNER' ? 'Entrar al scanner' : 'Entrar al panel';

  return {
    subject: `Te invitaron a ${venueName} como ${copy.roleLabel.toLowerCase()} 🎉`,
    html: renderLayout({
      title: `Invitación al equipo — NightPass`,
      preheader: `Ahora formas parte del equipo de ${venueName} en NightPass.`,
      eyebrowLabel: `Invitación · ${copy.roleLabel}`,
      bodyHtml: `
        ${renderEyebrow(copy.roleLabel)}
        ${renderHeading(`Hola, ${staffName}.`)}
        ${renderParagraph(
          `Te invitaron a formar parte del equipo de <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong>.`,
        )}
        ${renderParagraph(escapeHtml(copy.description))}
        ${credsHtml}
        ${renderButton(loginUrl, ctaLabel)}
        ${renderDivider()}
        ${renderSubheading('Lo que tendrás disponible')}
        ${renderNumberedList(copy.capabilities)}
      `,
    }),
    text: `Hola ${staffName},\n\nTe invitaron a "${venueName}" como ${copy.roleLabel}.\n\n${copy.description}${credsText}\n\nEntra: ${loginUrl}\n\n— Equipo NightPass`,
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
    ? renderInfoBox({ tone: 'danger', title: 'Motivo', bodyHtml: escapeHtml(reason) })
    : '';

  const reasonText = reason ? `\n\nMotivo: ${reason}` : '';

  return {
    subject: `Solicitud de ${venueName} — respuesta de NightPass`,
    html: renderLayout({
      title: 'Solicitud no aprobada — NightPass',
      preheader: `Tu solicitud para ${venueName} no fue aprobada en esta ocasión.`,
      eyebrowLabel: 'Resultado de tu solicitud',
      bodyHtml: `
        ${renderEyebrow('No aprobada')}
        ${renderHeading(`Hola, ${applicantName}.`)}
        ${renderParagraph(
          `Gracias por tu interés en NightPass. Lamentamos informarte que tu solicitud para <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong> no fue aprobada en esta ocasión.`,
        )}
        ${reasonHtml}
        ${renderDivider()}
        ${renderSubheading('Qué puedes hacer ahora')}
        ${renderNumberedList([
          {
            title: 'Vuelve a aplicar en 30 días',
            body: 'Podrás enviar una nueva solicitud transcurrido el periodo de espera.',
          },
          {
            title: 'Ajusta tu propuesta',
            body: 'Si crees que hubo un error o quieres clarificar algo, escríbenos a no-reply@nightpass.mx.',
          },
        ])}
      `,
    }),
    text: `Hola ${applicantName},\n\nGracias por tu interés. Lamentamos informarte que tu solicitud para "${venueName}" no fue aprobada en esta ocasión.${reasonText}\n\n01. Vuelve a aplicar en 30 días — podrás enviar una nueva solicitud transcurrido el periodo de espera.\n02. Ajusta tu propuesta — si crees que hubo un error o quieres clarificar algo, escríbenos a no-reply@nightpass.mx.\n\n— Equipo NightPass`,
  };
}
