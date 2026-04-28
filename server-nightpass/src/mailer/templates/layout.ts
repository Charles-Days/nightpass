interface LayoutInput {
  title: string;
  bodyHtml: string;
  preheader?: string;
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderLayout({ title, bodyHtml, preheader = '' }: LayoutInput): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#0A0A0F;line-height:1px;">${escape(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : '';

  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

${preheaderHtml}

<!-- OUTER WRAPPER -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0F;min-height:100vh;">
  <tr>
    <td align="center" style="padding:48px 16px 64px;">

      <!-- CARD (max 580px) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

        <!-- ─── HEADER ─── -->
        <tr>
          <td style="border-radius:20px 20px 0 0;overflow:hidden;background:linear-gradient(135deg,#3b0764 0%,#6b21a8 35%,#9333ea 65%,#a855f7 100%);padding:0;">
            <!-- Stars row -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:36px 40px 32px;">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.22em;color:rgba(255,255,255,0.55);text-transform:uppercase;">✦&nbsp;&nbsp;N I G H T P A S S&nbsp;&nbsp;✦</p>
                  <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:-0.04em;color:#fff;line-height:1;">NightPass</p>
                  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:0.02em;">Panel de gestión de vida nocturna</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ─── BODY ─── -->
        <tr>
          <td style="background:#0d0d18;border-left:1px solid rgba(168,85,247,0.18);border-right:1px solid rgba(168,85,247,0.18);padding:44px 40px 36px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- ─── FOOTER ─── -->
        <tr>
          <td align="center" style="background:#0d0d18;border:1px solid rgba(168,85,247,0.18);border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 20px 20px;padding:24px 40px 28px;">
            <p style="margin:0 0 8px;font-size:12px;color:#52525b;line-height:1.6;">
              Este es un email automático — no respondas a esta dirección.
            </p>
            <p style="margin:0;font-size:12px;color:#3f3f46;">
              &copy; 2026 NightPass · Todos los derechos reservados
            </p>
          </td>
        </tr>

      </table>
      <!-- /CARD -->

    </td>
  </tr>
</table>

</body>
</html>`;
}

export { escape as escapeHtml };

/* ── Helpers reutilizables ── */

export function renderButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 0;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#9333ea,#a855f7);box-shadow:0 4px 24px rgba(168,85,247,0.35);">
          <a href="${href}" target="_blank" style="display:inline-block;padding:15px 40px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.01em;white-space:nowrap;">${label} &rarr;</a>
        </td>
      </tr>
    </table>`;
}

export function renderCredentials(email: string, password: string, note?: string): string {
  const noteHtml = note
    ? `<p style="margin:16px 0 0;font-size:12px;color:#a16207;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:8px;padding:10px 14px;">${note}</p>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border-radius:14px;background:linear-gradient(135deg,rgba(147,51,234,0.1),rgba(168,85,247,0.05));border:1px solid rgba(168,85,247,0.28);">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#a855f7;">Email de acceso</p>
          <p style="margin:0 0 20px;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:15px;color:#e4e4e7;word-break:break-all;">${escape(email)}</p>
          <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 20px;"></div>
          <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#a855f7;">Contraseña temporal</p>
          <div style="background:rgba(0,0,0,0.45);border:1px solid rgba(168,85,247,0.35);border-radius:10px;padding:14px 20px;text-align:center;">
            <p style="margin:0;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:0.1em;color:#fff;">${escape(password)}</p>
          </div>
          ${noteHtml}
        </td>
      </tr>
    </table>`;
}

export function renderDivider(): string {
  return `<div style="height:1px;background:rgba(255,255,255,0.07);margin:28px 0;"></div>`;
}

export function renderEyebrow(text: string): string {
  return `<p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a855f7;">${escape(text)}</p>`;
}
