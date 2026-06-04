import * as React from 'react';
import { useAdminIssuedPasses, type IssuedPass } from '../hooks/use-admin-passes';
import { Loader2, Calendar, Ticket, User, ShieldAlert, Award } from 'lucide-react';

const money = (cents: number) => `$${(cents / 100).toFixed(2)} MXN`;

interface Props {
  eventId?: string;
}

export function IssuedPassesTable({ eventId }: Props) {
  const { data: claims, isLoading, isError } = useAdminIssuedPasses(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-rose-400 gap-2">
        <ShieldAlert className="size-8" />
        <p className="text-sm font-semibold">Error al cargar vales emitidos</p>
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <Ticket className="size-8 mx-auto text-neutral-600 mb-2" />
        <p className="text-sm">No se han emitido vales manuales aún.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/14 bg-white/[0.05]">
      <table className="w-full text-sm text-left text-white">
        <thead className="border-b border-white/12 bg-white/[0.035] text-xs uppercase tracking-wide text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Evento / Tier</th>
            <th className="px-4 py-3 font-semibold">Emitido Por (Admin)</th>
            <th className="px-4 py-3 font-semibold">Atribuido a RP</th>
            <th className="px-4 py-3 font-semibold">Reclamado por Cliente</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Vence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {claims.map((claim) => (
            <tr key={claim.id} className="hover:bg-white/[0.07] transition">
              <td className="px-4 py-3">
                <div className="font-semibold">{claim.event.title}</div>
                <div className="text-xs text-purple-400 mt-0.5">{claim.tier.name} · {money(claim.amountCents)}</div>
              </td>
              <td className="px-4 py-3 text-neutral-300">
                {claim.generatedByAdmin ? (
                  <div>
                    <div className="font-medium text-xs">{claim.generatedByAdmin.name}</div>
                    <div className="text-[10px] text-neutral-500">{claim.generatedByAdmin.email}</div>
                  </div>
                ) : (
                  <span className="text-neutral-500 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {claim.issuedByRp ? (
                  <div className="flex items-center gap-1">
                    <Award className="size-3.5 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-400">{claim.issuedByRp.displayName}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{claim.issuedByRp.rpCode}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-neutral-500 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {claim.claimedBy ? (
                  <div className="flex items-center gap-1">
                    <User className="size-3.5 text-purple-300" />
                    <div>
                      <div className="text-xs font-medium">{claim.claimedBy.name || 'Cliente'}</div>
                      <div className="text-[10px] text-neutral-500">{claim.claimedBy.email}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-neutral-500 text-xs">Pendiente de reclamo</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  claim.status === 'CLAIMED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : claim.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                }`}>
                  {claim.status === 'CLAIMED' ? 'Reclamado' : claim.status === 'PENDING' ? 'Activo' : claim.status}
                </span>
              </td>
              <td className="px-4 py-3 text-neutral-400 text-xs font-mono">
                {new Date(claim.expiresAt).toLocaleDateString('es-MX', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
