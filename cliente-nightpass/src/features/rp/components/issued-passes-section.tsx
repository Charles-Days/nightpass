'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Clock, Loader2, Ticket, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  useListIssuedRpPasses,
  useCancelIssuedRpPass,
  type IssuedPassDetail,
} from '../hooks/use-rp';

const money = (cents: number) => `$${(cents / 100).toFixed(2)} MXN`;

const STATUS: Record<
  IssuedPassDetail['status'],
  { label: string; cls: string }
> = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-300' },
  CLAIMED: { label: 'Reclamado', cls: 'bg-emerald-500/15 text-emerald-300' },
  EXPIRED: { label: 'Expirado', cls: 'bg-white/[0.06] text-muted-foreground' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-rose-500/15 text-rose-300' },
};

/** Cuenta regresiva «expira en Xm Ys» mientras el vale siga PENDING. */
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return <span className="text-rose-300">expira ya…</span>;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="tabular-nums">
      expira en {m}m {s.toString().padStart(2, '0')}s
    </span>
  );
}

function IssuedRow({ pass }: { pass: IssuedPassDetail }) {
  const cancel = useCancelIssuedRpPass();
  const st = STATUS[pass.status];

  const onCancel = async () => {
    try {
      await cancel.mutateAsync(pass.id);
      toast.success('Vale cancelado');
    } catch {
      toast.error('No se pudo cancelar el vale');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {pass.event.title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {pass.tier.name} · {money(pass.amountCents)}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {pass.status === 'PENDING' ? (
            <>
              <Clock className="size-3" />
              <Countdown expiresAt={pass.expiresAt} />
            </>
          ) : pass.status === 'CLAIMED' && pass.claimedBy ? (
            <>Reclamado por {pass.claimedBy.name ?? pass.claimedBy.email}</>
          ) : (
            <>—</>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>
          {st.label}
        </span>
        {pass.status === 'PENDING' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={cancel.isPending}
            onClick={onCancel}
            className="h-7 rounded-full px-2 text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            {cancel.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function IssuedPassesSection() {
  const { data, isLoading } = useListIssuedRpPasses();
  const passes = data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Ticket className="size-4 text-primary" />
        <h2 className="font-display text-base font-bold tracking-tight text-white">
          Vales emitidos
        </h2>
        <span className="text-xs text-muted-foreground">(últimos 50)</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Un vale sin reclamar expira solo a los 10 min y libera el cupo. También
        puedes cancelar los pendientes a mano.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : passes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-4 py-8 text-center text-sm text-muted-foreground">
          Aún no has emitido vales. Usa “Emitir pase” para generar uno.
        </p>
      ) : (
        <div className="space-y-2">
          {passes.map((p) => (
            <IssuedRow key={p.id} pass={p} />
          ))}
        </div>
      )}
    </section>
  );
}
