import {
  renderLayout,
  renderButton,
  renderDivider,
  renderEyebrow,
  renderHeading,
  renderParagraph,
  renderDataCard,
  renderNumberedList,
  renderInfoBox,
  renderFallbackUrl,
  escapeHtml,
} from './layout';

/* ─────────────────────────────────────────
   1. Bienvenida CUSTOMER → al crear cuenta
───────────────────────────────────────── */

export interface CustomerWelcomeInput {
  name: string;
  email: string;
  appUrl?: string;
}

export function customerWelcome(input: CustomerWelcomeInput) {
  const { name, email, appUrl } = input;
  const ctaUrl = appUrl ?? 'https://nightpass.mx/app';

  return {
    subject: `Bienvenido a NightPass, ${name} 🎉`,
    html: renderLayout({
      title: 'Bienvenido a NightPass',
      preheader:
        'Tu cuenta está lista. Descubre los mejores bares y eventos de la noche.',
      eyebrowLabel: 'Cuenta creada · Bienvenido',
      bodyHtml: `
        ${renderEyebrow('Cuenta creada')}
        ${renderHeading(`Hola, ${name}.`)}
        ${renderParagraph(
          'Tu cuenta NightPass ya está lista. A partir de esta noche puedes descubrir los lugares correctos, asegurar tu entrada antes de salir de casa y vivir la ciudad con quienes quieres ver.',
        )}
        ${renderDataCard([{ label: 'Acceso con', value: email }])}
        ${renderNumberedList([
          {
            title: 'Una agenda curada cada noche',
            body: 'Bares, fiestas y eventos seleccionados a mano. Sin scroll infinito.',
          },
          {
            title: 'Tu entrada vive en tu pase',
            body: 'Compras y entras con un QR. El portero lo escanea y listo.',
          },
          {
            title: 'Coordina con tu crew, sin grupos',
            body: 'Invita amigos, dividan la cuenta, vean en tiempo real quién ya llegó.',
          },
        ])}
        ${renderButton(ctaUrl, 'Abrir mi NightPass')}
      `,
    }),
    text: `Hola ${name},

Tu cuenta NightPass ya está lista.

Acceso con: ${email}

01. Una agenda curada cada noche — bares, fiestas y eventos seleccionados a mano.
02. Tu entrada vive en tu pase — compras y entras con un QR.
03. Coordina con tu crew — invita amigos y dividan la cuenta.

Abre la app: ${ctaUrl}

¿Dudas? Escríbenos a hola@nightpass.mx

— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   2. Reset de contraseña → al solicitar
───────────────────────────────────────── */

export interface PasswordResetInput {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function passwordReset(input: PasswordResetInput) {
  const { name, resetUrl, expiresInMinutes } = input;

  return {
    subject: `Restablece tu contraseña — NightPass`,
    html: renderLayout({
      title: 'Restablece tu contraseña',
      preheader: `Solicitaste cambiar tu contraseña. Este link expira en ${expiresInMinutes} minutos.`,
      eyebrowLabel: 'Restablecer acceso',
      bodyHtml: `
        ${renderEyebrow('Restablecer contraseña')}
        ${renderHeading(`Hola, ${name}.`)}
        ${renderParagraph(
          'Recibimos una solicitud para restablecer tu contraseña. Pulsa el botón para crear una nueva.',
        )}
        ${renderButton(resetUrl, 'Restablecer contraseña')}
        <p style="margin:18px 0 0;font-size:13px;color:rgba(245,243,255,0.45);text-align:center;line-height:1.6;">
          Este link expira en <strong style="color:#f5f3ff;">${expiresInMinutes} minutos</strong>.
        </p>
        ${renderDivider()}
        ${renderInfoBox({
          tone: 'warn',
          title: '¿No solicitaste esto?',
          bodyHtml:
            'Si no fuiste tú, ignora este correo. Tu contraseña actual seguirá funcionando.',
        })}
        ${renderFallbackUrl(resetUrl)}
      `,
    }),
    text: `Hola ${name},

Recibimos una solicitud para restablecer tu contraseña.

Abre este link (expira en ${expiresInMinutes} minutos):
${resetUrl}

Si no fuiste tú, ignora este correo. Tu contraseña actual seguirá funcionando.

— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   3. Confirmación cambio de contraseña
───────────────────────────────────────── */

export interface PasswordChangedInput {
  name: string;
  supportEmail?: string;
}

export function passwordChanged(input: PasswordChangedInput) {
  const { name, supportEmail = 'hola@nightpass.mx' } = input;
  const safeSupportEmail = escapeHtml(supportEmail);

  return {
    subject: `Tu contraseña fue actualizada — NightPass`,
    html: renderLayout({
      title: 'Contraseña actualizada',
      preheader: 'Tu contraseña de NightPass fue cambiada exitosamente.',
      eyebrowLabel: 'Contraseña actualizada',
      bodyHtml: `
        ${renderEyebrow('Cambio confirmado')}
        ${renderHeading(`Listo, ${name}.`)}
        ${renderParagraph(
          'Tu contraseña de NightPass fue actualizada. Ya puedes iniciar sesión con la nueva.',
        )}
        ${renderDivider()}
        ${renderInfoBox({
          tone: 'danger',
          title: '¿No fuiste tú?',
          bodyHtml: `Si no cambiaste tu contraseña, escríbenos de inmediato a <a href="mailto:${safeSupportEmail}" style="color:#a855f7;text-decoration:none;">${safeSupportEmail}</a> para proteger tu cuenta.`,
        })}
      `,
    }),
    text: `Hola ${name},

Tu contraseña de NightPass fue actualizada. Ya puedes iniciar sesión con la nueva.

¿No fuiste tú? Escríbenos de inmediato a ${supportEmail} para proteger tu cuenta.

— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   4. Verificación de cambio de correo → al nuevo correo
───────────────────────────────────────── */

export interface EmailChangeVerificationInput {
  name: string;
  newEmail: string;
  confirmUrl: string;
  expiresInMinutes: number;
}

export function emailChangeVerification(input: EmailChangeVerificationInput) {
  const { name, newEmail, confirmUrl, expiresInMinutes } = input;

  return {
    subject: `Confirma tu nuevo correo — NightPass`,
    html: renderLayout({
      title: 'Confirma tu nuevo correo',
      preheader: `Confirma este correo para usarlo en tu cuenta. El link expira en ${expiresInMinutes} minutos.`,
      eyebrowLabel: 'Cambio de correo',
      bodyHtml: `
        ${renderEyebrow('Confirma tu correo')}
        ${renderHeading(`Hola, ${name}.`)}
        ${renderParagraph(
          'Solicitaste cambiar el correo de tu cuenta NightPass a esta dirección. Confírmalo para activarlo — tu correo no cambiará hasta que pulses el botón.',
        )}
        ${renderDataCard([{ label: 'Nuevo correo', value: newEmail }])}
        ${renderButton(confirmUrl, 'Confirmar nuevo correo')}
        <p style="margin:18px 0 0;font-size:13px;color:rgba(245,243,255,0.45);text-align:center;line-height:1.6;">
          Este link expira en <strong style="color:#f5f3ff;">${expiresInMinutes} minutos</strong>. Al confirmar se cerrarán tus otras sesiones.
        </p>
        ${renderDivider()}
        ${renderInfoBox({
          tone: 'warn',
          title: '¿No solicitaste esto?',
          bodyHtml:
            'Si no pediste cambiar tu correo, ignora este mensaje. Tu cuenta seguirá usando el correo actual.',
        })}
        ${renderFallbackUrl(confirmUrl)}
      `,
    }),
    text: `Hola ${name},

Solicitaste cambiar el correo de tu cuenta NightPass a: ${newEmail}

Confírmalo abriendo este link (expira en ${expiresInMinutes} minutos):
${confirmUrl}

Tu correo no cambiará hasta que lo confirmes. Al confirmar se cerrarán tus otras sesiones.

Si no fuiste tú, ignora este correo.

— Equipo NightPass`,
  };
}

/* ─────────────────────────────────────────
   5. Aviso de cambio de correo → al correo anterior
───────────────────────────────────────── */

export interface EmailChangedInput {
  name: string;
  newEmail: string;
  supportEmail?: string;
}

export function emailChanged(input: EmailChangedInput) {
  const { name, newEmail, supportEmail = 'hola@nightpass.mx' } = input;
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeNewEmail = escapeHtml(newEmail);

  return {
    subject: `El correo de tu cuenta fue cambiado — NightPass`,
    html: renderLayout({
      title: 'Correo de cuenta cambiado',
      preheader: 'El correo de acceso de tu cuenta NightPass fue actualizado.',
      eyebrowLabel: 'Correo actualizado',
      bodyHtml: `
        ${renderEyebrow('Cambio confirmado')}
        ${renderHeading(`Hola, ${name}.`)}
        ${renderParagraph(
          'El correo de acceso de tu cuenta NightPass fue cambiado. A partir de ahora inicia sesión con tu nuevo correo:',
        )}
        ${renderDataCard([{ label: 'Nuevo correo', value: safeNewEmail }])}
        ${renderDivider()}
        ${renderInfoBox({
          tone: 'danger',
          title: '¿No fuiste tú?',
          bodyHtml: `Si no cambiaste tu correo, escríbenos de inmediato a <a href="mailto:${safeSupportEmail}" style="color:#a855f7;text-decoration:none;">${safeSupportEmail}</a> para proteger tu cuenta.`,
        })}
      `,
    }),
    text: `Hola ${name},

El correo de acceso de tu cuenta NightPass fue cambiado. A partir de ahora inicia sesión con: ${newEmail}

¿No fuiste tú? Escríbenos de inmediato a ${supportEmail} para proteger tu cuenta.

— Equipo NightPass`,
  };
}
