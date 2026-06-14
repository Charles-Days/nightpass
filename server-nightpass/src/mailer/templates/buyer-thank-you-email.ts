import {
  renderLayout,
  renderEyebrow,
  renderHeading,
  renderParagraph,
  renderButton,
  renderDivider,
  escapeHtml,
} from './layout';

export interface BuyerThankYouInput {
  buyerName: string;
  eventTitle: string;
  tierName: string;
  quantity: number;
  totalFormatted: string; // e.g. "$1,000.00 MXN"
  appUrl: string; // link back to app/panel
  storyCardUrl: string; // link firmado que descarga el PNG para Instagram
  eventDateLabel: string; // fecha del evento en español, ej. "4 de julio 2026"
}

/**
 * Correo de agradecimiento al comprador tras una compra completada.
 * Tono cálido, marca NightPass: agradece la confianza y la compra, y deja
 * los datos de la compra a la vista con un CTA para abrir sus pases.
 */
export function buyerThankYouEmail(
  input: BuyerThankYouInput,
): { subject: string; html: string; text: string } {
  const firstName = input.buyerName.trim().split(/\s+/)[0] || input.buyerName;

  const bodyHtml = `
    ${renderEyebrow('📲 Sube tu historia')}
    ${renderHeading(`¡Gracias, ${firstName}!`)}
    ${renderParagraph(`Tu compra de <strong>${input.totalFormatted}</strong> en ${escapeHtml(input.eventTitle)} quedó confirmada 🖤`)}
    ${renderParagraph('Descarga tu imagen, súbela a tu historia y etiqueta <strong>@nightpass_mx</strong>. Si la subes el día del evento, hay recompensa en la entrada.')}
    ${renderButton(input.storyCardUrl, 'Descargar imagen para mi historia')}
    ${renderDivider()}
    ${renderButton(input.appUrl, 'Ver mis pases')}
  `;

  const text = `¡Gracias, ${firstName}!

Tu compra de ${input.totalFormatted} en ${input.eventTitle} quedó confirmada.

📲 Sube tu historia
Descarga tu imagen, súbela a tu historia y etiqueta @nightpass_mx. Si la subes el día del evento, hay recompensa en la entrada.

Descarga tu imagen:
${input.storyCardUrl}

Ver mis pases:
${input.appUrl}

— Equipo NightPass`;

  return {
    subject: `Gracias por tu compra · ${input.eventTitle}`,
    html: renderLayout({
      title: 'Gracias por tu compra',
      bodyHtml,
      preheader: `Tu compra de ${input.tierName} × ${input.quantity} está confirmada`,
      eyebrowLabel: 'Compra confirmada · Gracias',
    }),
    text,
  };
}
