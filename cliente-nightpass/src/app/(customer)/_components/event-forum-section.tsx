'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, LogIn, MapPin, Loader2, Send, MessageCircle } from 'lucide-react';
import { useGeolocation } from '@/features/geolocation/hooks/use-geolocation';
import { useSession } from '@/features/auth/hooks/use-session';
import { paths } from '@/core/config/paths';

interface ForumPost {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null };
}

interface ForumResponse {
  items: ForumPost[];
}

function isToday(startsAt: string, endsAt: string): boolean {
  const now = Date.now();
  const start = new Date(startsAt).getTime() - 2 * 60 * 60 * 1000;
  const end = new Date(endsAt).getTime() + 2 * 60 * 60 * 1000;
  return now >= start && now <= end;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

interface Props {
  eventId: string;
  startsAt: string;
  endsAt: string;
}

export function EventForumSection({ eventId, startsAt, endsAt }: Props) {
  const session = useSession();
  const { status, request } = useGeolocation();
  const [requesting, setRequesting] = React.useState(false);
  const [body, setBody] = React.useState('');

  const isAuthed = !!session.data;
  const hasGeo = status === 'granted';
  const open = isToday(startsAt, endsAt);

  const qc = useQueryClient();
  const list = useQuery<ForumResponse | null>({
    queryKey: ['event-forum', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/events/${eventId}/forum`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return (await res.json()) as ForumResponse;
    },
    enabled: open && isAuthed && hasGeo,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const post = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/catalog/events/${eventId}/forum`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error('post failed');
      return res.json();
    },
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['event-forum', eventId] });
    },
  });

  if (!open) {
    return (
      <section className="np-rise mt-6 rounded-[18px] border border-white/10 bg-white/[0.025] p-5 text-center">
        <Lock className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 font-display text-base font-semibold">Foro del evento</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Se abre 2h antes del evento y cierra 2h después de terminar.
        </p>
      </section>
    );
  }

  return (
    <section className="np-rise mt-6">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="size-4 text-primary" />
        <h2 className="font-display text-lg font-bold tracking-tight">
          Foro del evento
        </h2>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
          En vivo
        </span>
      </div>

      {!isAuthed ? (
        <Link
          href={paths.iniciarSesion}
          className="flex items-center gap-2 rounded-[16px] border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15"
        >
          <LogIn className="size-4" />
          Inicia sesión para participar en el foro
        </Link>
      ) : !hasGeo ? (
        <button
          type="button"
          disabled={requesting}
          onClick={async () => {
            setRequesting(true);
            try {
              await request();
            } finally {
              setRequesting(false);
            }
          }}
          className="flex w-full items-center gap-2 rounded-[16px] border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.06]"
        >
          {requesting ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4 text-primary" />
          )}
          Comparte tu ubicación para ver y participar en el foro
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.025] p-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="¿Qué onda en el evento? Comparte algo… (máx 280)"
              rows={2}
              maxLength={280}
              className="w-full resize-none rounded-md bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">
                {body.length}/280
              </span>
              <button
                type="button"
                disabled={post.isPending || body.trim().length === 0}
                onClick={() => post.mutate(body.trim())}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] disabled:opacity-50"
              >
                {post.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Publicar
              </button>
            </div>
          </div>

          {list.isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : list.data && list.data.items.length > 0 ? (
            <ul className="space-y-2">
              {list.data.items.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white/85">
                      {p.user.name ?? 'Anónimo'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {timeAgo(p.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/80">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.015] p-6 text-center text-xs text-muted-foreground">
              Aún no hay mensajes. Sé el primero.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
