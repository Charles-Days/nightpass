'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { type BulkPendingItem, type ChooseBulkResult, useChooseBulk } from './use-rewards';

interface BulkChooseDialogProps {
  /** Promo pendiente a elegir. null = cerrado. */
  item: BulkPendingItem | null;
  onClose: () => void;
  /** Se llama tras cerrar el cupón (p. ej. para continuar un redirect). */
  onDone?: () => void;
}

/**
 * Modal de "elige tu regalo" para una promo BULK. Lista las opciones como cards
 * seleccionables; al elegir hace el POST /choose y muestra el cupón resultante
 * (código + QR) reusando el estilo del CouponDialog. Cuando el usuario cierra el
 * cupón, dispara onDone (lo usa el checkout para continuar el redirect).
 */
export function BulkChooseDialog({ item, onClose, onDone }: BulkChooseDialogProps) {
  const choose = useChooseBulk();
  const [coupon, setCoupon] = React.useState<ChooseBulkResult | null>(null);

  // Reinicia el cupón cuando se abre una promo distinta.
  React.useEffect(() => {
    if (item) setCoupon(null);
  }, [item?.redemptionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (optionId: string) => {
    if (!item) return;
    choose.mutate(
      { redemptionId: item.redemptionId, optionId },
      {
        onSuccess: (res) => {
          setCoupon(res);
          toast.success('¡Listo! Tu regalo está disponible.');
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : 'No se pudo elegir el regalo';
          toast.error(msg);
        },
      },
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    const hadCoupon = !!coupon;
    onClose();
    if (hadCoupon) onDone?.();
  };

  const open = !!item;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {coupon ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="text-primary size-5" />
                Tu regalo
              </DialogTitle>
              <DialogDescription>Muéstralo al staff del lugar para validarlo.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="font-display text-center text-lg font-bold">{coupon.title}</p>
              <p className="text-primary text-center text-xs font-semibold">{coupon.optionLabel}</p>
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={coupon.code} size={200} />
              </div>
              <p className="text-primary font-mono text-lg tracking-[0.3em]">{coupon.code}</p>
              <p className="text-muted-foreground text-[11px]">
                Vence el{' '}
                {new Date(coupon.expiresAt).toLocaleString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="text-primary size-5" />
                Elige tu regalo
              </DialogTitle>
              <DialogDescription>
                {[item?.reward.title, item?.reward.eventTitle]
                  .filter(Boolean)
                  .join(' · ')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-1">
              {(item?.reward.options ?? []).map((opt) => {
                const pending =
                  choose.isPending && choose.variables?.optionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={choose.isPending}
                    onClick={() => onPick(opt.id)}
                    className="border-primary/25 bg-primary/[0.06] hover:bg-primary/[0.1] flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      {opt.description && (
                        <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                          {opt.description}
                        </p>
                      )}
                    </div>
                    {pending ? (
                      <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
                    ) : (
                      <Gift className="text-primary/60 size-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
