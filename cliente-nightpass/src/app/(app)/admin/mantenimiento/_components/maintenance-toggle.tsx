'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';

interface Status {
  maintenance: boolean;
  message: string | null;
}

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    const payload = error.payload as { message?: string | string[] } | null;
    const m = payload?.message;
    if (Array.isArray(m)) return m[0] ?? 'No se pudo actualizar';
    if (typeof m === 'string') return m;
  }
  return 'No se pudo actualizar el modo mantenimiento';
}

export function MaintenanceToggle({ initial }: { initial: Status }) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(initial.maintenance);
  const [message, setMessage] = React.useState(initial.message ?? '');

  const save = useMutation<Status, ClientApiError, boolean>({
    mutationFn: (next) =>
      clientFetch<Status>('/api/maintenance', {
        method: 'POST',
        body: { enabled: next, message: message.trim() || undefined },
      }),
    onSuccess: (data) => {
      setEnabled(data.maintenance);
      toast.success(
        data.maintenance
          ? 'Modo mantenimiento ACTIVADO'
          : 'Modo mantenimiento desactivado',
      );
      router.refresh();
    },
    onError: (err) => toast.error(readError(err)),
  });

  return (
    <div className="mt-6 space-y-5">
      {/* Estado actual */}
      <div
        className={`flex items-center gap-3 rounded-[22px] border p-5 ${
          enabled
            ? 'border-amber-400/30 bg-amber-400/10'
            : 'border-emerald-400/30 bg-emerald-400/10'
        }`}
      >
        {enabled ? (
          <AlertTriangle className="size-6 shrink-0 text-amber-300" />
        ) : (
          <CheckCircle2 className="size-6 shrink-0 text-emerald-300" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {enabled
              ? 'Mantenimiento ACTIVO — la app está bloqueada para usuarios'
              : 'App operativa — todo normal'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {enabled
              ? 'Los usuarios ven la pantalla "Estamos actualizando". Tú (ADMIN) sigues navegando.'
              : 'Si el backend se cae, los usuarios verán mantenimiento automáticamente.'}
          </p>
        </div>
      </div>

      {/* Mensaje opcional */}
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-5">
        <label
          htmlFor="maint-msg"
          className="text-sm font-medium text-foreground"
        >
          Mensaje para los usuarios{' '}
          <span className="text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="maint-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Ej. Estamos mejorando los pagos. Volvemos en ~15 min."
          className="mt-2 w-full resize-none rounded-xl border border-white/14 bg-black/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-white/30 focus:border-primary/50"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {message.length}/280
        </p>
      </div>

      {/* Acción */}
      <Button
        onClick={() => save.mutate(!enabled)}
        disabled={save.isPending}
        className={`w-full rounded-full py-6 text-base font-semibold ${
          enabled
            ? 'bg-white/10 text-white hover:bg-white/15'
            : 'bg-gradient-to-r from-[#9333ea] to-[#a855f7]'
        }`}
      >
        {save.isPending ? (
          <Loader2 className="mr-1.5 size-5 animate-spin" />
        ) : (
          <Power className="mr-1.5 size-5" />
        )}
        {enabled ? 'Desactivar mantenimiento' : 'Activar mantenimiento'}
      </Button>
    </div>
  );
}
