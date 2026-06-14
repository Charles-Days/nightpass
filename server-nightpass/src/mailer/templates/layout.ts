/* ─────────────────────────────────────────────────────────────────────────
   NightPass — email design system
   "Membership Editorial" — adaptado del canvas (np-emails EmailA)
   ── Dark surface #0a0712 · gold hairlines · purple eyebrow · prose
   ── Tables-only para Gmail/Outlook safety
───────────────────────────────────────────────────────────────────────── */

interface LayoutInput {
  title: string;
  bodyHtml: string;
  preheader?: string;
  eyebrowLabel?: string; // overline en el hero (ej. "Cuenta creada · Emitido")
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONT_BODY = `'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const FONT_DISPLAY = `'Space Grotesk','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const FONT_MONO = `'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace`;

const COLOR = {
  bg: '#0a0712',
  surface: '#0d0a17',
  text: '#f5f3ff',
  textDim: 'rgba(245,243,255,0.72)',
  textFaint: 'rgba(245,243,255,0.45)',
  hero: '#a855f7',
  hero2: '#9333ea',
  gold: 'rgba(245,215,110,0.72)',
  goldBorder: 'rgba(245,215,110,0.18)',
  hairline: 'rgba(245,243,255,0.08)',
};

export function renderLayout({
  title,
  bodyHtml,
  preheader = '',
  eyebrowLabel,
}: LayoutInput): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${COLOR.bg};line-height:1px;">${escape(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : '';

  const eyebrowHtml = eyebrowLabel
    ? `<p style="margin:14px 0 0;font-size:10px;font-weight:500;letter-spacing:0.32em;color:${COLOR.gold};text-transform:uppercase;">${escape(eyebrowLabel)}</p>`
    : '';

  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escape(title)}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLOR.bg};font-family:${FONT_BODY};-webkit-font-smoothing:antialiased;color:${COLOR.text};">

${preheaderHtml}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.bg};">
  <tr>
    <td align="center" style="padding:48px 16px 56px;">

      <!-- ── EMAIL CARD (max 600px) ── -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${COLOR.bg};border-radius:6px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,0.55);">

        <!-- ─── HERO — editorial, no flat banner ─── -->
        <tr>
          <td style="background:linear-gradient(180deg,#07060d 0%,#0a0712 50%,#0d0a17 100%);padding:0;position:relative;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:52px 40px 44px;">
                  <!-- Wordmark — gradient purple text -->
                  <p style="margin:0;font-family:${FONT_DISPLAY};font-size:28px;font-weight:700;letter-spacing:-0.025em;line-height:1;background:linear-gradient(135deg,#c084fc 0%,${COLOR.hero} 50%,${COLOR.hero2} 100%);-webkit-background-clip:text;background-clip:text;color:${COLOR.hero};mso-text-raise:0;">
                    <span style="color:${COLOR.hero};background:linear-gradient(135deg,#c084fc 0%,${COLOR.hero} 50%,${COLOR.hero2} 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">NightPass</span>
                  </p>
                  ${eyebrowHtml}
                </td>
              </tr>
            </table>
            <!-- Gold hairline -->
            <div style="margin:0 56px;height:1px;background:linear-gradient(90deg,transparent,${COLOR.gold},transparent);"></div>
          </td>
        </tr>

        <!-- ─── BODY ─── -->
        <tr>
          <td style="background:${COLOR.bg};padding:48px 56px 40px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- ─── FOOTER ─── -->
        <tr>
          <td style="background:${COLOR.bg};border-top:1px solid ${COLOR.hairline};padding:28px 56px 36px;">
            <p style="margin:0 0 10px;font-size:13px;color:${COLOR.textDim};line-height:1.6;">
              ¿Necesitas ayuda? Escríbenos a <a href="mailto:no-reply@nightpass.mx" style="color:${COLOR.hero};text-decoration:none;font-weight:500;">no-reply@nightpass.mx</a>
            </p>
            <p style="margin:0;font-size:11px;color:${COLOR.textFaint};letter-spacing:0.02em;line-height:1.6;">
              NightPass · Ciudad de Cuernavaca · &copy; 2026 · Todos los derechos reservados<br>
              Este es un correo automático — no respondas a esta dirección.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}

export { escape as escapeHtml };

/* ── Helpers reutilizables ── */

/** Overline purple uppercase, sobre el H1 */
export function renderEyebrow(text: string): string {
  return `<p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${COLOR.hero};">${escape(text)}</p>`;
}

/** H1 editorial — Space Grotesk style */
export function renderHeading(text: string): string {
  return `<h1 style="margin:0 0 18px;font-family:${FONT_DISPLAY};font-weight:500;font-size:34px;line-height:1.1;letter-spacing:-0.025em;color:${COLOR.text};">${escape(text)}</h1>`;
}

/** Sub-heading (más pequeño, para sub-titulares dentro del body) */
export function renderSubheading(text: string): string {
  return `<p style="margin:0 0 14px;font-family:${FONT_DISPLAY};font-weight:600;font-size:20px;line-height:1.2;letter-spacing:-0.01em;color:${COLOR.text};">${escape(text)}</p>`;
}

/** Párrafo de cuerpo */
export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;color:${COLOR.textDim};line-height:1.65;">${text}</p>`;
}

/** CTA principal gradiente */
export function renderButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(180deg,${COLOR.hero} 0%,${COLOR.hero2} 100%);box-shadow:0 12px 32px -10px rgba(168,85,247,0.7);">
          <a href="${href}" target="_blank" style="display:inline-block;padding:16px 30px;font-family:${FONT_DISPLAY};font-size:15px;font-weight:600;color:#fff;text-decoration:none;letter-spacing:-0.005em;">${escape(label)} &rarr;</a>
        </td>
      </tr>
    </table>`;
}

/** Membership card — credenciales (email + temp password) con borde dorado */
export function renderCredentials(email: string, password: string, note?: string): string {
  const noteHtml = note
    ? `<p style="margin:16px 0 0;font-size:12px;color:#fde68a;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.25);border-radius:8px;padding:10px 14px;line-height:1.55;">${escape(note)}</p>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-radius:14px;background:linear-gradient(135deg,#1a0b2e 0%,#0f0820 100%);border:1px solid ${COLOR.goldBorder};">
      <tr>
        <td style="padding:22px 24px;">
          <p style="margin:0 0 8px;font-family:${FONT_MONO};font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};">Email de acceso</p>
          <p style="margin:0 0 18px;font-family:${FONT_MONO};font-size:14px;color:${COLOR.text};word-break:break-all;">${escape(email)}</p>
          <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 18px;"></div>
          <p style="margin:0 0 10px;font-family:${FONT_MONO};font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};">Contraseña temporal</p>
          <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.32);border-radius:10px;padding:14px 18px;text-align:center;">
            <p style="margin:0;font-family:${FONT_MONO};font-size:22px;font-weight:700;letter-spacing:0.1em;color:#fff;">${escape(password)}</p>
          </div>
          ${noteHtml}
        </td>
      </tr>
    </table>`;
}

/** Lista numerada editorial — reemplaza grids de emojis */
export interface NumberedItem {
  title: string;
  body: string;
}
export function renderNumberedList(items: NumberedItem[]): string {
  const rows = items
    .map(
      (it, idx) => `
        <tr>
          <td valign="top" style="width:52px;padding:0 0 24px;">
            <span style="font-family:${FONT_DISPLAY};font-weight:300;font-size:28px;color:${COLOR.hero};letter-spacing:-0.02em;line-height:1;">${String(idx + 1).padStart(2, '0')}</span>
          </td>
          <td valign="top" style="padding:0 0 24px 18px;">
            <p style="margin:0 0 5px;font-family:${FONT_DISPLAY};font-weight:600;font-size:16px;color:${COLOR.text};letter-spacing:-0.01em;line-height:1.3;">${escape(it.title)}</p>
            <p style="margin:0;font-size:14px;color:${COLOR.textDim};line-height:1.55;">${escape(it.body)}</p>
          </td>
        </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      ${rows}
    </table>`;
}

/** Info box con tono: purple (neutral), warn (amarillo), danger (rojo), success (verde) */
export type InfoTone = 'neutral' | 'warn' | 'danger' | 'success';
const TONE: Record<InfoTone, { fg: string; bg: string; bd: string; titleColor: string }> = {
  neutral: { fg: COLOR.textDim, bg: 'rgba(168,85,247,0.08)', bd: 'rgba(168,85,247,0.22)', titleColor: '#d8b4fe' },
  warn:    { fg: COLOR.textDim, bg: 'rgba(234,179,8,0.07)', bd: 'rgba(234,179,8,0.25)', titleColor: '#fde68a' },
  danger:  { fg: COLOR.textDim, bg: 'rgba(239,68,68,0.07)', bd: 'rgba(239,68,68,0.25)', titleColor: '#fca5a5' },
  success: { fg: COLOR.textDim, bg: 'rgba(34,197,94,0.07)', bd: 'rgba(34,197,94,0.28)', titleColor: '#86efac' },
};
export function renderInfoBox(args: { tone?: InfoTone; title?: string; bodyHtml: string }): string {
  const tone = TONE[args.tone ?? 'neutral'];
  const titleHtml = args.title
    ? `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${tone.titleColor};letter-spacing:-0.005em;">${escape(args.title)}</p>`
    : '';
  return `
    <div style="margin:24px 0;background:${tone.bg};border:1px solid ${tone.bd};border-radius:12px;padding:16px 20px;">
      ${titleHtml}
      <p style="margin:0;font-size:13px;color:${tone.fg};line-height:1.6;">${args.bodyHtml}</p>
    </div>`;
}

/** Caja para datos clave (ej. local + solicitante en email a admin) */
export interface DataRow {
  label: string;
  value: string;
  isHtml?: boolean;
}
export function renderDataCard(rows: DataRow[]): string {
  const inner = rows
    .map((r, idx) => {
      const top = idx === 0 ? '' : 'border-top:1px solid rgba(255,255,255,0.07);padding-top:16px;';
      const bottom = idx === rows.length - 1 ? '' : 'padding-bottom:16px;';
      const valueText = r.isHtml ? r.value : escape(r.value);
      return `
        <tr>
          <td style="${top}${bottom}">
            <p style="margin:0 0 4px;font-family:${FONT_MONO};font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};">${escape(r.label)}</p>
            <p style="margin:0;font-size:15px;color:${COLOR.text};line-height:1.4;">${valueText}</p>
          </td>
        </tr>`;
    })
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-radius:14px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);">
      <tr>
        <td style="padding:22px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${inner}
          </table>
        </td>
      </tr>
    </table>`;
}

/** Hairline divider */
export function renderDivider(): string {
  return `<div style="height:1px;background:${COLOR.hairline};margin:32px 0;"></div>`;
}

/** Línea de fallback con URL bajo el botón (cuando no abre el link) */
export function renderFallbackUrl(url: string): string {
  return `<p style="margin:20px 0 0;font-size:12px;color:${COLOR.textFaint};text-align:center;word-break:break-all;line-height:1.5;">¿No funciona el botón? Copia esta URL:<br><a href="${url}" style="color:${COLOR.textFaint};text-decoration:underline;">${escape(url)}</a></p>`;
}
