'use client';

import * as React from 'react';
import { useRpMeStats } from '@/features/rp/hooks/use-rp';
import { PhysicalRequestsSection } from '@/features/rp/components/physical-requests-section';
import { IssuePassDialog } from '@/features/rp/components/issue-pass-dialog';
import { IssuedPassesSection } from '@/features/rp/components/issued-passes-section';

import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import {
  Loader2,
  Copy,
  Percent,
  Coins,
  TrendingUp,
  Calendar,
  Sparkles,
  Ban,
  CheckCircle,
  Clock,
  Link2,
  ShieldCheck,
} from 'lucide-react';

export default function RpDashboardPage() {
  const { data: stats, isLoading } = useRpMeStats();
  const [activeTab, setActiveTab] = React.useState<'active' | 'passed'>('active');

  const displayMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)} MXN`;
  };

  const copyEventReferralLink = (eventId: string, eventName: string) => {
    if (!stats) return;
    const url = `${window.location.origin}/app/evento/${eventId}?ref=${stats.rpCode}`;
    navigator.clipboard.writeText(url);
    toast.success(`¡Link para "${eventName}" copiado al portapapeles!`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0c12] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0c0c12] text-white p-6">
        <p className="text-muted-foreground text-sm">Perfil de RP no encontrado o inactivo.</p>
      </div>
    );
  }

  // Filter events based on activeTab
  const activeEvents = stats.eventStats.filter(e => !e.isPassed);
  const passedEvents = stats.eventStats.filter(e => e.isPassed);
  const visibleEvents = activeTab === 'active' ? activeEvents : passedEvents;

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 text-white bg-transparent">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              ¡Hola, {stats.displayName}!
            </h1>
            <Sparkles className="size-5 text-purple-400 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">
            Gestiona tus eventos asignados, copia tus links y monitorea tus comisiones en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <IssuePassDialog
            events={activeEvents.map((e) => ({ eventId: e.eventId, eventName: e.eventName }))}
          />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-white/40">Código Único</span>
            <span className="text-xs bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full font-mono text-purple-300 font-semibold mt-1">
              {stats.rpCode}
            </span>
          </div>
        </div>
      </header>

      {/* Cómo se acreditan las ventas — explicación para el RP */}
      <div className="rounded-[22px] border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.06] to-transparent p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-purple-500/15 border border-purple-500/25">
            <Link2 className="size-4 text-purple-300" />
          </div>
          <div className="space-y-2.5">
            <h3 className="font-display text-base font-bold text-white">
              Mientras abran tu link, la venta es tuya
            </h3>
            <p className="text-sm leading-relaxed text-white/70">
              Cuando alguien abre tu link, guardamos tu código en su dispositivo. A partir de
              ahí la compra se te acredita <strong className="text-white">automáticamente</strong> —
              aunque cierre la página, navegue por la app, se vaya y regrese después, o tenga que
              crear cuenta o iniciar sesión para pagar. No necesita comprar en el mismo momento.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-0.5 text-[13px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <CheckCircle className="size-3.5" />
                Se guarda por 7 días en su dispositivo
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <ShieldCheck className="size-3.5" />
                Cuenta aunque cierre y vuelva a abrir la web
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-white/45">
              Solo no aplica si compra desde otro teléfono/computadora, en modo incógnito, o si
              pasan más de 7 días sin comprar. Por eso lo importante es que{' '}
              <strong className="text-white/70">abran tu link</strong> — el resto lo hacemos nosotros.
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Sales Card */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.02] backdrop-blur-xl p-6 transition hover:border-white/18">
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-24 bg-purple-500/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Boletos Vendidos
            </span>
            <TrendingUp className="size-4 text-purple-400" />
          </div>
          <span className="font-display text-4xl font-extrabold text-white block mt-4">
            {stats.totalSales}
          </span>
          <p className="text-xs text-muted-foreground mt-2">
            Entradas totales adquiridas con tu código
          </p>
        </div>

        {/* Commission Earned Card */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.02] backdrop-blur-xl p-6 transition hover:border-white/18">
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comisiones Totales
            </span>
            <Coins className="size-4 text-emerald-400" />
          </div>
          <span className="font-display text-4xl font-extrabold text-[#10b981] block mt-4">
            {displayMoney(stats.totalEarningsCents)}
          </span>
          <p className="text-xs text-muted-foreground mt-2">
            Dinero ganado por tus ventas completadas
          </p>
        </div>
      </div>

      {/* Progress Cards towards next rewards */}
      {stats.eventStats.some(e => !e.isPassed && e.rule?.type === 'PER_N_TICKETS') && (
        <div className="space-y-4">
          <h3 className="font-display text-base font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-4 text-purple-400" />
            Metas de Ventas Activas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.eventStats.map((eventStat) => {
              if (!eventStat.isPassed && eventStat.rule?.type === 'PER_N_TICKETS' && eventStat.rule.nTickets) {
                const nTickets = eventStat.rule.nTickets;
                const currentCount = eventStat.salesCount;
                const progress = currentCount % nTickets;
                const percentage = (progress / nTickets) * 100;
                const missing = nTickets - progress;

                return (
                  <div
                    key={`progress-${eventStat.eventId}`}
                    className="rounded-[22px] border border-white/12 bg-white/[0.025] p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="max-w-[70%]">
                        <h4 className="font-display text-sm font-semibold text-white truncate">
                          {eventStat.eventName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Meta: {displayMoney(eventStat.rule.rewardCents || 0)} cada {nTickets} boletos
                        </p>
                      </div>
                      <span className="text-xs text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full shrink-0">
                        {progress} / {nTickets}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/14 p-0.5">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Faltan <strong className="text-white">{missing}</strong> boletos para el siguiente bono de{' '}
                      <strong className="text-primary">{displayMoney(eventStat.rule.rewardCents || 0)}</strong>.
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* Events tab selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-2">
          <h3 className="font-display text-lg font-bold tracking-tight">Mis Eventos</h3>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/12 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'active'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Eventos Activos ({activeEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('passed')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'passed'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Eventos Pasados ({passedEvents.length})
            </button>
          </div>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/14 p-12 text-center text-sm text-muted-foreground bg-white/[0.02]">
            {activeTab === 'active'
              ? 'No tienes eventos activos en este momento.'
              : 'No tienes registro de eventos pasados.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleEvents.map((eventStat, idx) => (
              <div
                key={eventStat.eventId || `event-${idx}`}
                className={`rounded-[24px] border p-5 flex flex-col justify-between transition-all bg-[#09090f] ${
                  eventStat.isPassed
                    ? 'border-white/10 opacity-75'
                    : 'border-white/12 hover:border-white/18'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-display text-base font-bold text-white line-clamp-1">
                      {eventStat.eventName}
                    </h4>
                    {eventStat.isPassed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0">
                        <Ban className="size-3" />
                        Pasado / Inactivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle className="size-3" />
                        Activo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Calendar className="size-3.5 text-purple-400" />
                    <span>{formatDate(eventStat.eventStartsAt)}</span>
                  </div>

                  {/* Commission schema */}
                  <div className="mt-4 p-3.5 rounded-xl bg-white/[0.035] border border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">Regla de Comisión</span>
                    {eventStat.rule?.type === 'PERCENTAGE' ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                        <Percent className="size-3.5" />
                        <span>{eventStat.rule.percentage}% por entrada vendida</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-yellow-400 font-semibold">
                        <Coins className="size-3.5" />
                        <span>{displayMoney(eventStat.rule?.rewardCents || 0)} por cada {eventStat.rule?.nTickets || 10} boletos</span>
                      </div>
                    )}
                  </div>

                  {/* mini metrics */}
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <span className="text-[10px] text-muted-foreground block">Boletos</span>
                      <strong className="text-white text-base block mt-0.5">{eventStat.salesCount}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <span className="text-[10px] text-muted-foreground block">Ganancia</span>
                      <strong className="text-[#10b981] text-base block mt-0.5">{displayMoney(eventStat.earningsCents)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  {eventStat.isPassed ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-400/70 py-2">
                      <Ban className="size-3.5" />
                      <span>El evento ya finalizó. Las ventas y links de RP están inhabilitados.</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>Comparte el link para ganar</span>
                      </div>
                      <Button
                        onClick={() => copyEventReferralLink(eventStat.eventId, eventStat.eventName)}
                        className="rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:brightness-110 text-white font-semibold flex items-center gap-1.5 h-9 text-xs px-4"
                      >
                        <Copy className="size-3.5" />
                        Copiar Link
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vales emitidos por el RP (QR/link) */}
      <IssuedPassesSection />

      {/* Solicitudes de pago en efectivo */}
      <PhysicalRequestsSection />

      {/* Sales log breakdown */}
      <div className="space-y-3">
        <h3 className="font-display text-base font-bold tracking-tight">Historial General de Ventas</h3>
        {stats.sales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/14 p-12 text-center text-sm text-muted-foreground bg-white/[0.02]">
            No hay transacciones registradas todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c12] text-xs">
            <div className="grid grid-cols-3 border-b border-white/12 bg-white/[0.035] p-4 font-semibold text-white/70">
              <span>Fecha / Evento</span>
              <span className="text-center">Tipo de Pase</span>
              <span className="text-right">Monto</span>
            </div>
            <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
              {stats.sales.map((sale) => (
                <div key={sale.id} className="grid grid-cols-3 p-4 items-center">
                  <div className="space-y-0.5">
                    <span className="font-medium text-white truncate block text-sm">
                      {sale.eventName}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {new Date(sale.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-center block truncate">
                    {sale.tierName}
                  </span>
                  <span className="text-right font-medium text-white font-mono text-sm block">
                    {displayMoney(sale.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
