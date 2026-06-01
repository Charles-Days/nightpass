import {
  renderLayout,
  renderEyebrow,
  renderHeading,
  renderParagraph,
  renderDataCard,
  renderButton,
  renderInfoBox,
  renderFallbackUrl,
} from './layout';

interface PhysicalPaymentRequestToRpInput {
  rpName: string;
  eventTitle: string;
  tierName: string;
  quantity: number;
  amountFormatted: string;
  customerName: string;
  customerEmail: string;
  customerContact?: string;
  note?: string;
  panelUrl: string;
}

/**
 * Aviso al RP: un cliente quiere pagar en efectivo un evento que el RP tiene
 * asignado. El RP cobra en persona y luego confirma la solicitud en el panel.
 */
export function physicalPaymentRequestToRp(
  input: PhysicalPaymentRequestToRpInput,
): { subject: string; html: string; text: string } {
  const rows = [
    { label: 'Evento', value: input.eventTitle },
    { label: 'Boleto', value: `${input.tierName} × ${input.quantity}` },
    { label: 'Monto a cobrar', value: input.amountFormatted },
    { label: 'Cliente', value: input.customerName },
    { label: 'Email del cliente', value: input.customerEmail },
  ];
  if (input.customerContact) {
    rows.push({ label: 'Contacto', value: input.customerContact });
  }
  if (input.note) {
    rows.push({ label: 'Nota del cliente', value: input.note });
  }

  const bodyHtml = `
    ${renderEyebrow('Pago en efectivo')}
    ${renderHeading('Nueva solicitud de pago en efectivo')}
    ${renderParagraph(`Hola ${input.rpName}, un cliente quiere pagarte <strong>en efectivo</strong> un boleto de un evento que tienes asignado. Coordina el cobro y, una vez recibido el dinero, confírmalo en el panel para que su pase digital se emita al instante.`)}
    ${renderDataCard(rows)}
    ${renderInfoBox({
      tone: 'warn',
      title: 'Importante',
      bodyHtml:
        'El pase se emite únicamente cuando confirmas la solicitud en el panel. No confirmes hasta haber recibido el pago.',
    })}
    ${renderButton(input.panelUrl, 'Ver solicitudes')}
    ${renderFallbackUrl(input.panelUrl)}
  `;

  const text = `Hola ${input.rpName},

Un cliente quiere pagar en efectivo un evento que tienes asignado.

Evento: ${input.eventTitle}
Boleto: ${input.tierName} × ${input.quantity}
Monto a cobrar: ${input.amountFormatted}
Cliente: ${input.customerName} (${input.customerEmail})${input.customerContact ? `\nContacto: ${input.customerContact}` : ''}${input.note ? `\nNota: ${input.note}` : ''}

Cobra en persona y luego confirma la solicitud en el panel para emitir el pase:
${input.panelUrl}

— Equipo NightPass`;

  return {
    subject: `Pago en efectivo solicitado · ${input.eventTitle}`,
    html: renderLayout({
      title: 'Solicitud de pago en efectivo',
      bodyHtml,
      preheader: `${input.customerName} quiere pagarte en efectivo ${input.tierName} × ${input.quantity}`,
      eyebrowLabel: 'Solicitud · Efectivo',
    }),
    text,
  };
}
