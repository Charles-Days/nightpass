'use client';

import * as React from 'react';
import Image from 'next/image';
import { Calendar, Radio, Search } from 'lucide-react';
import { Input } from '@/core/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet';
import { StoriesManager } from '@/features/stories-admin';
import type { Event, Venue } from '@/core/types/api';

type Selected =
  | { kind: 'venue'; id: string; name: string }
  | { kind: 'event'; id: string; name: string };

function formatEventDate(iso: string): string {
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

export function AdminStoriesClient({
  venues,
  events,
}: {
  venues: Venue[];
  events: Event[];
}) {
  const [selected, setSelected] = React.useState<Selected | null>(null);

  return (
    <>
      <Tabs defaultValue="venues" className="space-y-5">
        <TabsList className="bg-white/[0.03]">
          <TabsTrigger value="venues">Bares y antros</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="venues">
          <VenuesTab venues={venues} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab events={events} onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-white/10 px-6 pb-4 pt-5">
            <SheetTitle className="font-display text-2xl">
              {selected ? `Historias · ${selected.name}` : 'Historias'}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {selected && (
              <StoriesManager
                key={`${selected.kind}-${selected.id}`}
                target={
                  selected.kind === 'venue'
                    ? { venueId: selected.id }
                    : { eventId: selected.id }
                }
                title={selected.name}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Tab: Bares y antros ─────────────────────────────────────────────────────

function VenuesTab({
  venues,
  onSelect,
}: {
  venues: Venue[];
  onSelect: (s: Selected) => void;
}) {
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.slug.toLowerCase().includes(q),
    );
  }, [venues, query]);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.025]">
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
        <Search className="size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar local por nombre, ciudad o slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-0 bg-transparent p-0 focus-visible:ring-0"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} locales</span>
      </div>
      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No hay locales que coincidan.
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {filtered.map((v) => (
            <li
              key={v.id}
              onClick={() => onSelect({ kind: 'venue', id: v.id, name: v.name })}
              className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.05]"
            >
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
                {v.coverImageUrl ? (
                  <Image
                    src={v.coverImageUrl}
                    alt={v.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center font-display text-sm font-bold text-white/40">
                    {v.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v.name}</p>
                <p className="truncate text-xs text-muted-foreground">{v.city}</p>
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
  );
}

// ─── Tab: Eventos ────────────────────────────────────────────────────────────

function EventsTab({
  events,
  onSelect,
}: {
  events: Event[];
  onSelect: (s: Selected) => void;
}) {
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const host = e.venue?.name ?? e.promoter?.name ?? e.externalVenueName ?? '';
      return (
        e.title.toLowerCase().includes(q) ||
        host.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q)
      );
    });
  }, [events, query]);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.025]">
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
        <Search className="size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar evento por nombre, organizador o slug…"
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
        <ul className="divide-y divide-white/5">
          {filtered.map((e) => {
            const host = e.venue?.name ?? e.promoter?.name ?? e.externalVenueName ?? '—';
            return (
              <li
                key={e.id}
                onClick={() => onSelect({ kind: 'event', id: e.id, name: e.title })}
                className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.05]"
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
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
                    {host} · {formatEventDate(e.startsAt)}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
