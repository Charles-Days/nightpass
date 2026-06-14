import {
  renderLayout,
  renderButton,
  renderDivider,
  renderEyebrow,
  renderHeading,
  renderParagraph,
  renderInfoBox,
  escapeHtml,
} from './layout';

/* ─────────────────────────────────────────
   1. Local suspendido → al OWNER
───────────────────────────────────────── */

export interface VenueSuspendedInput {
  ownerName: string;
  venueName: string;
  reason?: string;
  supportEmail?: string;
}

export function venueSuspended(input: VenueSuspendedInput) {
  const { ownerName, venueName, reason, supportEmail = 'no-reply@nightpass.mx' } = input;

  const reasonHtml = reason
    ? renderInfoBox({ tone: 'danger', title: 'Motivo', bodyHtml: escapeHtml(reason) })
    : '';

  const reasonText = reason ? `\n\nMotivo: ${reason}` : '';

  return {
    subject: `${venueName} fue suspendido — NightPass`,
    html: renderLayout({
      title: 'Local suspendido',
      preheader: `Tu local ${venueName} fue suspendido temporalmente en NightPass.`,
      eyebrowLabel: 'Local suspendido',
      bodyHtml: `
        ${renderEyebrow('Local suspendido')}
        ${renderHeading(`Hola, ${ownerName}.`)}
        ${renderParagraph(`Te escribimos para informarte que tu local <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong> fue suspendido temporalmente en NightPass.`)}
        ${renderParagraph('Mientras esté suspendido no podrás publicar eventos nuevos y los clientes no verán tu local en la app. Los eventos ya publicados pueden quedar ocultos.')}
        ${reasonHtml}
        ${renderDivider()}
        ${renderParagraph(`Si crees que es un error o quieres saber qué pasos tomar para reactivar tu local, contáctanos directamente en <a href="mailto:${escapeHtml(supportEmail)}" style="color:#a855f7;text-decoration:none;font-weight:500;">${escapeHtml(supportEmail)}</a>.`)}
      `,
    }),
    text: `Hola ${ownerName},\n\nTu local "${venueName}" fue suspendido temporalmente en NightPass.${reasonText}\n\nMientras esté suspendido no podrás publicar eventos nuevos.\n\nSi crees que es un error, contáctanos: ${supportEmail}\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   2. Local reactivado → al OWNER
───────────────────────────────────────── */

export interface VenueReactivatedInput {
  ownerName: string;
  venueName: string;
  loginUrl: string;
}

export function venueReactivated(input: VenueReactivatedInput) {
  const { ownerName, venueName, loginUrl } = input;

  return {
    subject: `${venueName} fue reactivado 🎉 — NightPass`,
    html: renderLayout({
      title: 'Local reactivado',
      preheader: `Tu local ${venueName} volvió a estar activo en NightPass.`,
      eyebrowLabel: 'Local reactivado',
      bodyHtml: `
        ${renderEyebrow('Reactivado')}
        ${renderHeading(`Buenas noticias, ${ownerName}.`)}
        ${renderParagraph(`Tu local <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong> volvió a estar activo en NightPass. Ya puedes publicar eventos, recibir clientes y gestionar tu equipo con normalidad.`)}
        ${renderButton(loginUrl, 'Entrar al panel')}
        ${renderDivider()}
        <p style="margin:0;font-size:13px;color:rgba(245,243,255,0.45);text-align:center;line-height:1.6;">Gracias por formar parte de NightPass.</p>
      `,
    }),
    text: `¡Buenas noticias, ${ownerName}!\n\nTu local "${venueName}" volvió a estar activo en NightPass. Ya puedes publicar eventos con normalidad.\n\nEntra al panel: ${loginUrl}\n\n— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   3. Staff revocado → al STAFF
───────────────────────────────────────── */

export interface StaffRevokedInput {
  staffName: string;
  venueName: string;
  supportEmail?: string;
}

export function staffRevoked(input: StaffRevokedInput) {
  const { staffName, venueName, supportEmail = 'no-reply@nightpass.mx' } = input;

  return {
    subject: `Ya no formas parte del equipo de ${venueName}`,
    html: renderLayout({
      title: 'Acceso revocado',
      preheader: `Tu acceso al panel de ${venueName} fue revocado.`,
      eyebrowLabel: 'Acceso revocado',
      bodyHtml: `
        ${renderEyebrow('Acceso revocado')}
        ${renderHeading(`Hola, ${staffName}.`)}
        ${renderParagraph(`Te informamos que tu acceso al equipo de <strong style="color:#f5f3ff;">${escapeHtml(venueName)}</strong> fue revocado. A partir de ahora ya no podrás escanear pases ni acceder al panel del local.`)}
        ${renderParagraph('Tu cuenta NightPass sigue activa — puedes seguir usándola como cliente en la app móvil para descubrir bares y eventos.')}
        ${renderDivider()}
        ${renderParagraph(`¿Tienes dudas? Escríbenos a <a href="mailto:${escapeHtml(supportEmail)}" style="color:#a855f7;text-decoration:none;font-weight:500;">${escapeHtml(supportEmail)}</a>.`)}
      `,
    }),
    text: `Hola ${staffName},\n\nTu acceso al equipo de "${venueName}" fue revocado. Ya no podrás escanear pases ni acceder al panel del local.\n\nTu cuenta NightPass sigue activa para uso como cliente.\n\n¿Dudas? Escríbenos a ${supportEmail}\n\n— Equipo NightPass`,
  };
}
