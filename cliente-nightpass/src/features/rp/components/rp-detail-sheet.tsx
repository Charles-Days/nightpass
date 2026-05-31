'use client';

import * as React from 'react';
import { useRpStats, useDeleteCommissionRule } from '../hooks/use-rp';
import { CommissionRuleForm } from './commission-rule-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet';
import {
  Loader2,
  Copy,
  Plus,
  Trash2,
  Percent,
  Coins,
  ArrowUpRight,
  Pencil,
} from 'lucide-react';


interface RpDetailSheetProps {
  rpId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  basePath?: string;
}

export function RpDetailSheet({ rpId, open, onOpenChange, basePath = '/api/rp' }: RpDetailSheetProps) {
  const { data: stats, isLoading, refetch } = useRpStats(rpId, basePath);
  const { mutate: deleteRule } = useDeleteCommissionRule();
  const [showAddRule, setShowAddRule] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (open) {
      setShowAddRule(false);
      setEditingRule(null);
    }
  }, [open]);

  // Format currency cents
  const displayMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)} MXN`;
  };

  const copyReferralLink = (code: string) => {
    const url = `${window.location.origin}/app/checkout?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de referido copiado al portapapeles');
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!rpId) return;
    deleteRule(
      { rpId, ruleId },
      {
        onSuccess: () => {
          toast.success('Regla de comisión eliminada correctamente');
          refetch();
        },
        onError: (err: any) => {
          toast.error(err.payload?.message || 'Error al eliminar la regla');
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl border-l border-white/10 bg-[#0c0c12] text-white">
        <SheetHeader className="shrink-0 border-b border-white/8 px-6 pb-4 pt-5">
          <SheetTitle className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">Detalle de Relaciones Públicas</span>
            {stats && (
              <span className="shrink-0 text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full font-mono text-purple-300">
                {stats.rpCode}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !stats ? (
          <p className="mt-8 text-center text-muted-foreground">RP no encontrado</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* Header / Info card */}
            <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold">{stats.displayName}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Estadísticas totales e historial</p>
                </div>
                <Button
                  onClick={() => copyReferralLink(stats.rpCode)}
                  className="rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-2 h-10 px-4 self-start"
                >
                  <Copy className="size-4" />
                  Copiar Link
                </Button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">
                    Ventas Realizadas
                  </span>
                  <span className="font-display text-2xl font-bold text-white block mt-1">
                    {stats.totalSales}
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide block">
                    Comisión Ganada
                  </span>
                  <span className="font-display text-2xl font-bold text-primary block mt-1">
                    {displayMoney(stats.totalEarningsCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Commission Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  Reglas de Comisión
                </h3>
                <Button
                  onClick={() => {
                    setShowAddRule(!showAddRule);
                    setEditingRule(null);
                  }}
                  className="rounded-lg h-8 px-3 text-xs bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="size-3.5" />
                  {showAddRule ? 'Cerrar' : 'Asignar evento'}
                </Button>
              </div>

              {showAddRule && rpId && (
                <div className="np-fade-in">
                  <CommissionRuleForm
                    rpId={rpId}
                    basePath={basePath}
                    initialRule={editingRule}
                    assignedEventIds={stats.eventStats
                      .map((e) => e.eventId)
                      .filter((id): id is string => !!id)}
                    onSuccess={() => {
                      setShowAddRule(false);
                      setEditingRule(null);
                      refetch();
                    }}
                  />
                </div>
              )}

              {stats.eventStats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
                  No hay reglas de comisión configuradas. Agrega una para empezar a calcular.
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.eventStats.map((ruleStat, idx) => (
                    <div
                      key={ruleStat.eventId || `global-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-medium text-white block">
                          {ruleStat.eventName || 'Regla General (Todos los Eventos)'}
                        </span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {ruleStat.rule?.type === 'PERCENTAGE' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="size-3 text-emerald-400" />
                              {ruleStat.rule.percentage}% de cada entrada
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Coins className="size-3 text-yellow-400" />
                              {displayMoney(ruleStat.rule?.rewardCents || 0)} por cada{' '}
                              {ruleStat.rule?.nTickets} boletos
                            </span>
                          )}
                          ·
                          <span>
                            Ganado: <strong className="text-white">{displayMoney(ruleStat.earningsCents)}</strong> ({ruleStat.salesCount} ventas)
                          </span>
                        </div>
                      </div>
                      {ruleStat.rule && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingRule({
                              eventId: ruleStat.eventId,
                              ...ruleStat.rule
                            });
                            setShowAddRule(true);
                          }}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg size-8 shrink-0"
                          title="Editar Regla de Comisión"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sales logs */}
            <div className="space-y-3">
              <h3 className="font-display text-sm font-semibold tracking-tight">Historial de Ventas</h3>
              {stats.sales.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-6 text-center text-xs text-muted-foreground">
                  Aún no hay compras registradas con este código.
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-[#08080d] overflow-hidden text-xs">
                  <div className="grid grid-cols-3 border-b border-white/5 bg-white/[0.02] p-3 font-semibold text-white/70">
                    <span>Fecha / Evento</span>
                    <span className="text-center">Tipo de Pase</span>
                    <span className="text-right">Monto</span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                    {stats.sales.map((sale) => (
                      <div key={sale.id} className="grid grid-cols-3 p-3 items-center">
                        <div className="space-y-0.5">
                          <span className="font-medium text-white truncate block">
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
                        <span className="text-right font-medium text-white font-mono block">
                          {displayMoney(sale.totalCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
