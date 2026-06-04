'use client';

import * as React from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Loader2, Radio, Search } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Event, PaginatedEvents } from '@/core/types/api';
import { Input } from '@/core/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet';
import { StoriesManager } from './stories-manager';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PromoterStoriesManager() {
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'promoter-me', 'for-stories'],
    queryFn: () => clientFetch<PaginatedEvents>('/api/events?limit=100'),
  });

  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<{ id: string; title: string } | null>(null);

  const events = data?.items ?? [];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) => e.title.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q),
    );
  }, [events, query]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/18 bg-white/[0.035] px-6 py-12 text-center">
        <Calendar className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Aún no tienes eventos. Crea uno para empezar a publicar historias.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05]">
        <div className="flex items-center gap-3 border-b border-white/12 px-5 py-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar evento por nombre o slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} eventos</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No hay eventos que coincidan.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {filtered.map((e: Event) => (
              <li
                key={e.id}
                onClick={() => setSelected({ id: e.id, title: e.title })}
                className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.08]"
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/14 bg-white/[0.08]">
                  {e.coverImageUrl ? (
                    <Image
                      src={e.coverImageUrl}
                      alt={e.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <Calendar className="m-auto size-4 text-white/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(e.startsAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
                >
                  <Radio className="size-3.5" />
                  Gestionar historias
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-white/14 px-6 pb-4 pt-5">
            <SheetTitle className="font-display text-2xl">
              {selected ? `Historias · ${selected.title}` : 'Historias'}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {selected && (
              <StoriesManager
                key={selected.id}
                target={{ eventId: selected.id }}
                title={selected.title}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
