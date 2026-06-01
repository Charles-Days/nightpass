'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export type CashWalletTxType =
  | 'TOPUP'
  | 'CASH_FEE_DEBIT'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export interface CashWalletTx {
  id: string;
  type: CashWalletTxType;
  amountCents: number;
  balanceAfterCents: number;
  currency: string;
  note: string | null;
  createdAt: string;
}

export interface CashWalletView {
  balanceCents: number;
  currency: string;
  cashCommissionExempt: boolean;
  effectiveFeePct: number;
  transactions: CashWalletTx[];
}

export interface TopupResponse {
  clientSecret: string;
  publishableKey?: string;
  amountCents: number;
  currency: string;
}

/** Exactamente uno de venueId / promoterId. */
export type WalletOwner = { venueId: string } | { promoterId: string };

function ownerQuery(owner: WalletOwner): string {
  return 'venueId' in owner
    ? `venueId=${owner.venueId}`
    : `promoterId=${owner.promoterId}`;
}

function ownerKey(owner: WalletOwner): string {
  return 'venueId' in owner ? `venue:${owner.venueId}` : `promoter:${owner.promoterId}`;
}

export function useCashWallet(owner: WalletOwner) {
  return useQuery({
    queryKey: ['cash-wallet', ownerKey(owner)],
    queryFn: () =>
      clientFetch<CashWalletView>(`/api/cash-wallet?${ownerQuery(owner)}`),
  });
}

export function useCashWalletTopup(owner: WalletOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountCents: number) =>
      clientFetch<TopupResponse>('/api/cash-wallet/topup', {
        method: 'POST',
        body: { ...owner, amountCents },
      }),
    onSuccess: () => {
      // El saldo se acredita vía webhook (async); refrescamos al confirmar.
      qc.invalidateQueries({ queryKey: ['cash-wallet', ownerKey(owner)] });
    },
  });
}

export function useRefetchCashWallet(owner: WalletOwner) {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({ queryKey: ['cash-wallet', ownerKey(owner)] });
}
