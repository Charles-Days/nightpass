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

export interface PromoterReceivedToApplicantInput {
  applicantName: string;
  promoterName: string;
}

export function promoterApplicationReceivedToApplicant(
  input: PromoterReceivedToApplicantInput,
) {
  const { applicantName, promoterName } = input;
  return {
    subject: `Recibimos tu solicitud de organizador ✓`,
    html: renderLayout({
      title: 'Solicitud recibida — NightPass',
      preheader: `Tu solicitud para ${promoterName} está en revisión. Te avisaremos pronto.`,
      eyebrowLabel: 'Solicitud recibida',
      bodyHtml: `
        ${renderEyebrow('En revisión')}
        ${renderHeading(`Hola, ${applicantName}.`)}
        ${renderParagraph(
          `Recibimos tu solicitud para operar como organizador con <strong style="color:#f5f3ff;">${escapeHtml(promoterName)}</strong> en NightPass. Nuestro equipo la revisará en los próximos días.`,
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
    text: `Hola ${applicantName},\n\nRecibimos tu solicitud para operar como organizador con "${promoterName}" en NightPass.\n\n01. En revisión — tu solicitud está en la cola del equipo NightPass.\n02. Te avisamos por correo — cuando haya una respuesta, te llegará a esta misma dirección. No necesitas hacer nada.\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   2. Nueva solicitud → al admin
───────────────────────────────────────── */

export interface PromoterReceivedToAdminInput {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  promoterName: string;
  adminWebUrl: string;
}

export function promoterApplicationReceivedToAdmin(
  input: PromoterReceivedToAdminInput,
) {
  const { applicantName, applicantEmail, promoterName, adminWebUrl } = input;
  const link = `${adminWebUrl.replace(/\/$/, '')}/admin/solicitudes?type=promotora`;
  return {
    subject: `Nueva solicitud de organizador: ${promoterName}`,
    html: renderLayout({
      title: 'Nueva solicitud — NightPass Admin',
      preheader: `${applicantName} quiere registrar "${promoterName}" en NightPass.`,
      eyebrowLabel: 'Solicitud pendiente',
      bodyHtml: `
        ${renderEyebrow('Nueva solicitud')}
        ${renderHeading('Hay una solicitud por revisar.')}
        ${renderDataCard([
          { label: 'Organizador', value: promoterName },
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
    text: `Nueva solicitud pendiente.\n\nOrganizador: ${promoterName}\nSolicitante: ${applicantName} (${applicantEmail})\n\nRevisar: ${link}\n\n— NightPass`,
  };
}

/* ─────────────────────────────────────────
   3. Solicitud aprobada → al solicitante
───────────────────────────────────────── */

export interface PromoterApprovedInput {
  applicantName: string;
  promoterName: string;
  loginUrl: string;
  loginEmail: string;
  temporaryPassword: string;
  isExistingUser: boolean;
}

export function promoterApplicationApproved(input: PromoterApprovedInput) {
  const {
    applicantName,
    promoterName,
    loginUrl,
    loginEmail,
    temporaryPassword,
    isExistingUser,
  } = input;

  const existingUserNote = isExistingUser
    ? 'Esta contraseña reemplaza la que usabas en la app móvil. Cámbiala desde tu perfil al entrar.'
    : undefined;

  return {
    subject: `🎉 ¡Bienvenido a NightPass, ${applicantName}!`,
    html: renderLayout({
      title: `${promoterName} aprobada — NightPass`,
      preheader: `¡Tu cuenta de organizador ${promoterName} ya está activa! Aquí están tus credenciales de acceso al panel.`,
      eyebrowLabel: 'Solicitud aprobada · Acceso emitido',
      bodyHtml: `
        ${renderEyebrow('Solicitud aprobada')}
        ${renderHeading(`Bienvenido a NightPass, ${applicantName}.`)}
        ${renderParagraph(
          `Tu cuenta de organizador <strong style="color:#f5f3ff;">${escapeHtml(promoterName)}</strong> ya está activa en la plataforma. Te creamos una cuenta de panel para que la gestiones: publica eventos, invita a tu equipo y supervisa la operación.`,
        )}
        ${renderCredentials(loginEmail, temporaryPassword, existingUserNote)}
        <p style="margin:14px 0 0;font-size:13px;color:rgba(245,243,255,0.45);text-align:center;line-height:1.6;">Al entrar, el sistema te pedirá cambiar esta contraseña.</p>
        ${renderButton(loginUrl, 'Entrar al panel')}
        ${renderDivider()}
        ${renderSubheading('Qué puedes hacer ahora')}
        ${renderNumberedList([
          {
            title: 'Crea eventos en venues del catálogo o en ubicaciones externas',
            body: 'Publica eventos asociados a un local de NightPass o en sedes externas (casa, terraza, rooftop) con sus tiers de precio.',
          },
          {
            title: 'Conecta tu cuenta Stripe para cobrar pases',
            body: 'Activa pagos para que tus asistentes compren pases directamente desde la app.',
          },
          {
            title: 'Invita a tu equipo de scanner para validar entradas',
            body: 'Añade staff de entrada para escanear pases en la puerta el día del evento.',
          },
        ])}
      `,
    }),
    text: `¡Enhorabuena, ${applicantName}!\n\n${promoterName} ya está activa en NightPass.\n\nTus credenciales:\nEmail: ${loginEmail}\nContraseña temporal: ${temporaryPassword}\n\nEntra al panel: ${loginUrl}\n\nAl entrar, el sistema te pedirá cambiar esta contraseña.\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   4. Solicitud rechazada → al solicitante
───────────────────────────────────────── */

export interface PromoterRejectedInput {
  applicantName: string;
  promoterName: string;
  reason?: string;
}

export function promoterApplicationRejected(input: PromoterRejectedInput) {
  const { applicantName, promoterName, reason } = input;

  const reasonHtml = reason
    ? renderInfoBox({ tone: 'danger', title: 'Motivo', bodyHtml: escapeHtml(reason) })
    : '';

  const reasonText = reason ? `\n\nMotivo: ${reason}` : '';

  return {
    subject: `Tu solicitud de organizador — respuesta de NightPass`,
    html: renderLayout({
      title: 'Solicitud no aprobada — NightPass',
      preheader: `Tu solicitud para ${promoterName} no fue aprobada en esta ocasión.`,
      eyebrowLabel: 'Resultado de tu solicitud',
      bodyHtml: `
        ${renderEyebrow('No aprobada')}
        ${renderHeading(`Hola, ${applicantName}.`)}
        ${renderParagraph(
          `Gracias por tu interés en NightPass. Lamentamos informarte que tu solicitud para operar como organizador con <strong style="color:#f5f3ff;">${escapeHtml(promoterName)}</strong> no fue aprobada en esta ocasión.`,
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
    text: `Hola ${applicantName},\n\nGracias por tu interés. Lamentamos informarte que tu solicitud para operar como organizador con "${promoterName}" no fue aprobada en esta ocasión.${reasonText}\n\n01. Vuelve a aplicar en 30 días — podrás enviar una nueva solicitud transcurrido el periodo de espera.\n02. Ajusta tu propuesta — si crees que hubo un error o quieres clarificar algo, escríbenos a no-reply@nightpass.mx.\n\n— Equipo NightPass`,
  };
}
