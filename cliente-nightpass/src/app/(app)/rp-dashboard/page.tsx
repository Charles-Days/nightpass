'use client';

import * as React from 'react';
import { Banknote, MapPin } from 'lucide-react';
import { useRpMe, useRpMeStats, useRpPhysicalRequests } from '@/features/rp/hooks/use-rp';
import { PhysicalRequestsSection } from '@/features/rp/components/physical-requests-section';
import { PickupPointsManager } from '@/features/rp/components/pickup-points-manager';
import { RpZoneEditor } from '@/features/rp/components/rp-zone-editor';
import { IssuePassDialog } from '@/features/rp/components/issue-pass-dialog';
import { RpReferralDialog } from '@/features/rp/components/rp-referral-dialog';

const TABS = [
  { key: 'cobranza', label: 'Cobranza', icon: Banknote },
  { key: 'puntos', label: 'Puntos de cobro', icon: MapPin },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function RpDashboardPage() {
  const { data: stats } = useRpMeStats();
  const { data: reqData } = useRpPhysicalRequests();
  const activeEvents = (stats?.eventStats ?? []).filter((e) => !e.isPassed);
  const pending = (reqData?.items ?? []).filter((r) => r.status === 'PENDING').length;
  const { data: me } = useRpMe();
  const [tab, setTab] = React.useState<TabKey>('cobranza');
  const [showInfo, setShowInfo] = React.useState(false);
  // El efectivo solo aplica si el RP tiene ≥1 evento con pago en efectivo activo.
  const showCash = stats?.hasCashEvents === true;

  const myPhone = me?.user?.phone?.trim() || '';
  const myZone = [me?.city, me?.state].filter(Boolean).join(', ');
  const infoComplete = !!myPhone && !!me?.state && !!me?.city;

  const events = activeEvents.map((e) => ({ eventId: e.eventId, eventName: e.eventName }));

  return (
    <div className="space-y-6">
      {/* Formas de vender pases */}
      <section className="space-y-3 border-b border-white/10 pb-5">
        <h2 className="font-display text-lg font-bold tracking-tight">Formas de vender pases</h2>
        <div className="flex flex-wrap items-center gap-2">
          {stats?.rpCode ? <RpReferralDialog rpCode={stats.rpCode} events={events} /> : null}
          <IssuePassDialog events={events} />
        </div>
      </section>

      {/* Cobranza/puntos solo si el RP tiene eventos con pago en efectivo. */}
      {showCash && (
        <>
          {/* Tabs — cobranza diaria vs config de puntos. `isolate` encierra el
              z-index interno para que no se encime con el header sticky. */}
          <div className="relative isolate grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.05] p-1">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_4px_16px_-4px_rgba(168,85,247,0.6)] transition-transform duration-300 ease-out will-change-transform"
              style={{ transform: tab === 'puntos' ? 'translateX(100%)' : 'translateX(0%)' }}
            />
            {TABS.map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors duration-200 ${
                    active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {t.label}
                  {t.key === 'cobranza' && pending > 0 ? (
                    <span className="rounded-full bg-white/20 px-1.5 text-[10px] leading-tight font-bold text-white">
                      {pending}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {tab === 'cobranza' ? (
            <div key="cobranza" className="np-fade-in">
              <PhysicalRequestsSection />
            </div>
          ) : (
            <div key="puntos" className="np-fade-in space-y-6">
              {stats?.rpId ? (
                <div
                  className={`rounded-[18px] border p-4 ${
                    infoComplete
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-red-500/30 bg-red-500/[0.06]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span
                          className={`size-2 shrink-0 rounded-full ${
                            infoComplete ? 'bg-emerald-400' : 'bg-red-500'
                          }`}
                        />
                        Tu número y zona
                      </p>
                      {infoComplete ? (
                        <p className="mt-1 text-xs text-white/70">
                          📞 {myPhone} · {myZone}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-red-300/90">
                          Falta {myPhone ? '' : 'tu número'}
                          {!myPhone && (!me?.state || !me?.city) ? ' y ' : ''}
                          {!me?.state || !me?.city ? 'tu zona' : ''}. El cliente lo
                          necesita para contactarte.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInfo((v) => !v)}
                      className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                      {showInfo ? 'Cerrar' : infoComplete ? 'Actualizar' : 'Completar'}
                    </button>
                  </div>
                  {showInfo && (
                    <div className="mt-4">
                      <RpZoneEditor rpId={stats.rpId} />
                    </div>
                  )}
                </div>
              ) : null}
              <PickupPointsManager />
            </div>
          )}
        </>
      )}

      {/* Sin eventos de efectivo: la cobranza/puntos no aplican aún. Lo
          explicamos para que el panel no se vea vacío/roto. */}
      {stats && !showCash && (
        <div className="rounded-[18px] border border-dashed border-white/14 bg-white/[0.02] p-8 text-center">
          <span className="bg-primary/12 text-primary mx-auto grid size-12 place-items-center rounded-2xl">
            <Banknote className="size-6" />
          </span>
          <p className="font-display mt-4 text-base font-bold text-white">
            Aún no tienes cobranza
          </p>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
            Cuando un organizador o el admin te asigne a un evento con pago en
            efectivo, aquí aparecerán tu cobranza y tus puntos de cobro. Mientras,
            puedes vender con tu link o generando pases.
          </p>
        </div>
      )}
    </div>
  );
}
