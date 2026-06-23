'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  MapPin,
  Phone,
  Ticket,
  User,
} from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
  type NotificationItem,
} from '../hooks/use-notifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: (item: NotificationItem) => void;
}) {
  const d = item.data;
  const unread = !item.readAt;
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={cn(
        'flex w-full flex-col items-start gap-1.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.05]',
        unread && 'bg-primary/[0.06]',
      )}
    >
      <div className="flex w-full items-start gap-2">
        {unread ? (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
        ) : (
          <span className="mt-1.5 size-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.body}</p>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {timeAgo(item.createdAt)}
        </span>
      </div>

      {/* Info completa del cliente que hizo la petición */}
      {d ? (
        <div className="ml-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {(d.customerName || d.customerEmail) && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" />
              {d.customerName || d.customerEmail}
            </span>
          )}
          {(d.customerPhone || d.contactPhone) && (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {d.customerPhone || d.contactPhone}
            </span>
          )}
          {(d.customerCity || d.customerState) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {[d.customerCity, d.customerState].filter(Boolean).join(', ')}
            </span>
          )}
          {d.tierName && d.quantity ? (
            <span className="inline-flex items-center gap-1">
              <Ticket className="size-3" />
              {d.tierName} · {d.quantity}×
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: unread } = useUnreadCount();
  const { data, isLoading } = useNotifications(open);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const count = unread?.count ?? 0;
  const items = data?.items ?? [];

  // Cierra al hacer click fuera.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function handleItemClick(item: NotificationItem) {
    if (!item.readAt) markRead.mutate(item.id);
    setOpen(false);
    if (item.url) router.push(item.url);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-white"
      >
        <Bell className="size-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-[18px] border border-white/12 bg-[#0d0d14]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notificaciones</p>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition hover:text-primary/80 disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Check className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No tienes notificaciones.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onClick={handleItemClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
