'use client';

import { WhatsappIcon } from '@/core/components/icons/whatsapp-icon';

interface Props {
  href: string;
  eventId: string;
  label: string;
  className?: string;
}

// Enlace al grupo de WhatsApp de un evento. Al tocarlo registra un clic
// (fire-and-forget) para que el admin vea cuántas personas únicas se interesaron
// en el grupo, sin bloquear la navegación: el <a> abre WhatsApp normalmente.
export function WhatsappJoinLink({ href, eventId, label, className }: Props) {
  function handleClick() {
    // keepalive: el beacon sobrevive aunque el navegador cambie de pestaña/app.
    fetch(`/api/events/${eventId}/whatsapp-click`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      <WhatsappIcon className="size-3.5 shrink-0" />
      {label}
    </a>
  );
}
