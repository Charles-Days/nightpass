'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { money } from '@/features/admin-finance/lib/format';
import { useEventSales } from '../hooks/use-event-sales';
import { useSendThankYou } from '../hooks/use-send-thank-you';
import { useThankYouPreview } from '../hooks/use-thank-you-preview';

const TOP_SPENDER_CENTS = 100_000; // ≥ $1,000.00

export function EventPurchasesSection({ eventId }: { eventId: string }) {
  const { data, isLoading, isError } = useEventSales(eventId);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Cargando compras…</p>;
  }

  if (isError) {
    return <p className="text-xs text-muted-foreground">No pudimos cargar las compras.</p>;
  }

  const orders = data?.orders ?? [];

  if (orders.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin compras todavía.</p>;
  }

  // Mayores compradores primero — para premiar a quien más gastó.
  const sorted = [...orders].sort((a, b) => b.totalCents - a.totalCents);
  const previewOrder = sorted.find((o) => o.id === previewOrderId) ?? null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Lista de <strong className="text-foreground">todos los compradores de boletos</strong> de este
        evento. Desde aquí puedes enviarle a cada uno un correo de agradecimiento. Esto es distinto a
        las comisiones de RPs.
      </p>

      <div className="max-h-[28rem] overflow-x-auto overflow-y-auto rounded-xl border border-white/14">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-white/12 bg-white/[0.035] text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Tier</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((order) => {
              const isTop = order.totalCents >= TOP_SPENDER_CENTS;
              return (
                <tr
                  key={order.id}
                  className="border-b border-white/10 last:border-b-0 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.user.name ?? order.user.email}</p>
                      {isTop && (
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Top
                        </span>
                      )}
                    </div>
                    {order.user.name ? (
                      <p className="text-[11px] text-muted-foreground">{order.user.email}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{order.tier.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{money(order.totalCents)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewOrderId(order.id)}
                    >
                      <Mail className="size-4" />
                      Enviar gracias
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ThankYouPreviewDialog
        eventId={eventId}
        orderId={previewOrderId}
        buyerLabel={previewOrder ? (previewOrder.user.name ?? previewOrder.user.email) : ''}
        onClose={() => setPreviewOrderId(null)}
      />
    </div>
  );
}

function ThankYouPreviewDialog({
  eventId,
  orderId,
  buyerLabel,
  onClose,
}: {
  eventId: string;
  orderId: string | null;
  buyerLabel: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useThankYouPreview(eventId, orderId);
  const { mutate, isPending } = useSendThankYou();

  const handleSend = () => {
    if (!orderId) return;
    mutate({ eventId, orderId }, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={!!orderId} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Vista previa del correo</DialogTitle>
          <DialogDescription>
            Así se verá el correo de agradecimiento para {buyerLabel}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generando vista previa…
          </div>
        ) : isError || !data ? (
          <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
            No pudimos generar la vista previa.
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Correo */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Asunto: <span className="text-foreground">{data.subject}</span>
              </p>
              <iframe
                srcDoc={data.html}
                sandbox=""
                className="h-[60vh] w-full rounded-lg border border-white/12 bg-white"
                title="Vista previa del correo"
              />
            </div>

            {/* Imagen para historia */}
            <div className="flex shrink-0 flex-col gap-2 lg:w-[260px]">
              <p className="text-xs text-muted-foreground">
                Imagen para historia{' '}
                <span className="text-foreground">(la descarga el cliente)</span>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.storyCardUrl}
                alt="Imagen de historia para Instagram"
                className="mx-auto h-[60vh] w-auto rounded-lg border border-white/12 bg-[#0a0712] object-contain"
              />
              <a
                href={data.storyCardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-center text-xs text-primary hover:underline"
              >
                Abrir / descargar imagen
              </a>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isPending || isLoading}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Enviar correo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
