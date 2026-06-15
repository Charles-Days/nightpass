'use client';

import * as React from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Gift, Loader2, Lock, Sparkles, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { paths } from '@/core/config/paths';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import {
  type AvailableReward,
  type BulkPendingItem,
  type RedeemResult,
  type Redemption,
  useAvailableRewards,
  useBulkPending,
  useMyRedemptions,
  useRedeemReward,
} from './use-rewards';
import { BulkChooseDialog } from './bulk-choose-dialog';

function discountLabel(r: AvailableReward): string | null {
  if (r.discountType === 'PERCENT') return `${r.discountValue}% off`;
  if (r.discountType === 'FIXED') return `$${(r.discountValue / 100).toFixed(0)} off`;
  return null;
}

/** Catálogo de recompensas canjeables + cupones del usuario. */
export function RewardsSection() {
  const { data, isLoading } = useAvailableRewards();
  const redeem = useRedeemReward();
  const [coupon, setCoupon] = React.useState<RedeemResult | null>(null);

  const onRedeem = (id: string) => {
    redeem.mutate(id, {
      onSuccess: (res) => {
        setCoupon(res);
        toast.success('¡Canjeado! Muestra el cupón en el lugar.');
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : 'No se pudo canjear';
        toast.error(msg);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="text-primary size-5 animate-spin" />
      </div>
    );
  }

  const rewards = data?.rewards ?? [];
  const balance = data?.balance ?? 0;

  return (
    <div>
      {/* Promos por elegir (regalo por comprar N boletos) van arriba del todo:
          el usuario tiene que tomar una decisión para reclamar su regalo. */}
      <PendingBulkPromos />

      {/* Cupones canjeados van primero: son lo más urgente (mostrarlos al staff
          en el bar) y no deben quedar enterrados bajo el catálogo. */}
      <MyCoupons />

      {rewards.length === 0 ? (
        <div className="border-primary/20 from-primary/[0.08] relative overflow-hidden rounded-[22px] border bg-gradient-to-br to-white/[0.02] p-7 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full opacity-40 blur-[60px]"
            style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
          />
          <div className="bg-primary/15 text-primary ring-primary/25 relative mx-auto grid size-14 place-items-center rounded-2xl ring-1">
            <Gift className="size-7" />
          </div>
          <p className="font-display relative mt-4 text-base font-bold">
            Tus recompensas están en camino
          </p>
          <p className="relative mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-white/55">
            Sigue sumando NPP. En cuanto un bar de tu zona active perks, aparecen aquí para canjear.
          </p>
          {data && data.balance > 0 && (
            <p className="text-primary relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold">
              Llevas {data.balance} NPP listos
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
              Canjea tus NPP
            </h3>
            <span className="bg-primary/12 text-primary rounded-full px-2.5 py-1 text-[11px] font-semibold">
              Tienes {balance} NPP
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {rewards.map((r) => {
              const disc = discountLabel(r);
              const pending = redeem.isPending && redeem.variables === r.id;
              const missing = Math.max(0, r.costNpp - balance);
              return (
                <div
                  key={r.id}
                  className="flex flex-col rounded-[18px] border border-white/12 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/15 text-primary grid size-9 shrink-0 place-items-center rounded-[10px]">
                      {r.kind === 'TICKET_DISCOUNT' ? (
                        <Ticket className="size-4" />
                      ) : (
                        <Gift className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight font-semibold">{r.title}</p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {r.ownerName}
                        {disc ? ` · ${disc}` : ''}
                      </p>
                    </div>
                  </div>
                  {r.description && (
                    <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                      {r.description}
                    </p>
                  )}
                  {!r.redeemable && !r.limitReached && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((balance / r.costNpp) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    {r.kind === 'TICKET_DISCOUNT' && r.eventId ? (
                      <>
                        {disc && (
                          <span className="font-display text-primary text-base font-bold">
                            {disc}
                          </span>
                        )}
                        <Link
                          href={`${paths.evento}/${r.eventId}?reward=${r.id}` as never}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95"
                        >
                          <Ticket className="size-3.5" />
                          Comprar con descuento
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="font-display text-primary text-base font-bold">
                          {r.costNpp} NPP
                        </span>
                        <button
                          type="button"
                          disabled={!r.redeemable || pending}
                          onClick={() => onRedeem(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {pending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : !r.redeemable ? (
                            <Lock className="size-3.5" />
                          ) : null}
                          {r.limitReached
                            ? 'Límite'
                            : !r.redeemable
                              ? `Faltan ${missing} NPP`
                              : 'Canjear'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CouponDialog coupon={coupon} onClose={() => setCoupon(null)} />
    </div>
  );
}

function PendingBulkPromos() {
  const { data } = useBulkPending();
  const [active, setActive] = React.useState<BulkPendingItem | null>(null);
  const items = data?.items ?? [];

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="border-primary/25 from-primary/[0.12] relative overflow-hidden rounded-[18px] border bg-gradient-to-br to-white/[0.02] p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full opacity-40 blur-[55px]"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
        />
        <div className="relative flex items-start gap-3">
          <span className="bg-primary/15 text-primary ring-primary/25 grid size-9 shrink-0 place-items-center rounded-[10px] ring-1">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold">
              Tienes {items.length} promo{items.length > 1 ? 's' : ''} por elegir
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
              Elige tu regalo por tu compra antes de que venza.
            </p>
          </div>
        </div>
        <div className="relative mt-3 space-y-2">
          {items.map((it) => (
            <button
              key={it.redemptionId}
              type="button"
              onClick={() => setActive(it)}
              className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-left transition hover:bg-white/[0.07] active:scale-[0.99]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {it.reward.title}
                </span>
                {it.reward.eventTitle && (
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {it.reward.eventTitle}
                  </span>
                )}
              </span>
              <span className="bg-primary/15 text-primary inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold">
                <Gift className="size-3" />
                Elegir
              </span>
            </button>
          ))}
        </div>
      </div>

      <BulkChooseDialog item={active} onClose={() => setActive(null)} />
    </div>
  );
}

function MyCoupons() {
  const { data } = useMyRedemptions();
  const coupons = (data ?? []).filter((c) => c.status === 'PENDING');
  const [active, setActive] = React.useState<Redemption | null>(null);

  if (coupons.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-primary mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase">
        <Ticket className="size-3.5" />
        Listos para usar
      </h3>
      <div className="space-y-2">
        {coupons.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c)}
            className="border-primary/25 bg-primary/[0.06] hover:bg-primary/[0.1] flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition active:scale-[0.99]"
          >
            <span className="grid size-9 place-items-center rounded-[10px] bg-white p-1">
              <QRCodeSVG value={c.code} size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{c.reward.title}</p>
              <p className="text-muted-foreground truncate text-[11px]">
                {[c.reward.event?.title, c.selectedOption?.label]
                  .filter(Boolean)
                  .join(' · ') || 'Toca para mostrar el cupón'}
              </p>
            </div>
            <span className="text-primary font-mono text-[11px] tracking-widest">{c.code}</span>
          </button>
        ))}
      </div>

      <CouponDialog
        coupon={
          active
            ? {
                id: active.id,
                code: active.code,
                title: active.reward.title,
                kind: active.reward.kind as RedeemResult['kind'],
                expiresAt: active.expiresAt,
                costNpp: active.costNpp,
                eventTitle: active.reward.event?.title ?? null,
                optionLabel: active.selectedOption?.label ?? null,
              }
            : null
        }
        onClose={() => setActive(null)}
      />
    </div>
  );
}

type CouponView = RedeemResult & {
  eventTitle?: string | null;
  optionLabel?: string | null;
};

function CouponDialog({ coupon, onClose }: { coupon: CouponView | null; onClose: () => void }) {
  return (
    <Dialog open={!!coupon} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="text-primary size-5" />
            Tu cupón
          </DialogTitle>
          <DialogDescription>Muéstralo al staff del lugar para validarlo.</DialogDescription>
        </DialogHeader>
        {coupon && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="text-center">
              <p className="font-display text-lg font-bold">{coupon.title}</p>
              {(coupon.eventTitle || coupon.optionLabel) && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[coupon.eventTitle, coupon.optionLabel].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
