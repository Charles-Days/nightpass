'use client';

import * as React from 'react';
import { Check, Gift, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import {
  type CreateRewardBody,
  type OwnerReward,
  useCreateReward,
  useDeleteReward,
  useOwnerRewards,
  useUpdateReward,
  useValidateCoupon,
} from './use-rewards-admin';

interface Template {
  title: string;
  description: string;
  costNpp: number;
  discountType: 'NONE' | 'PERCENT';
  discountValue: number;
}

// Plantillas sugeridas (el bar las fondea — pérdida NP $0).
const TEMPLATES: Template[] = [
  { title: 'Trago de bienvenida', description: 'Un shot/trago al llegar.', costNpp: 400, discountType: 'NONE', discountValue: 0 },
  { title: '2x1 en entrada', description: 'Entra con un amigo gratis.', costNpp: 800, discountType: 'NONE', discountValue: 0 },
  { title: '10% en tu cuenta', description: '10% de descuento en tu consumo.', costNpp: 1000, discountType: 'PERCENT', discountValue: 10 },
];

export function RewardsManager({ venueId }: { venueId: string }) {
  const { data: rewards, isLoading } = useOwnerRewards(venueId);
  const create = useCreateReward();
  const update = useUpdateReward();
  const del = useDeleteReward();
  const [open, setOpen] = React.useState(false);

  const toggleActive = (r: OwnerReward) =>
    update.mutate(
      { id: r.id, body: { active: !r.active } },
      { onError: () => toast.error('No se pudo actualizar') },
    );

  const remove = (r: OwnerReward) => {
    if (!confirm(`¿Eliminar "${r.title}"?`)) return;
    del.mutate(r.id, {
      onSuccess: () => toast.success('Recompensa eliminada'),
      onError: () => toast.error('No se pudo eliminar'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Recompensas que tus clientes canjean con sus NPP. Las fondea tu local.
        </p>
        <Button onClick={() => setOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (rewards ?? []).length === 0 ? (
        <div className="rounded-[18px] border border-white/12 bg-white/[0.03] p-6 text-center text-sm text-muted-foreground">
          Aún no tienes recompensas. Crea una desde una plantilla.
        </div>
      ) : (
        <ul className="space-y-2">
          {rewards!.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-[14px] border border-white/12 bg-white/[0.04] px-4 py-3"
            >
              <span className="grid size-9 place-items-center rounded-[10px] bg-primary/15 text-primary">
                <Gift className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.costNpp} NPP{r.description ? ` · ${r.description}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(r)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                  r.active
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {r.active ? 'Activa' : 'Inactiva'}
              </button>
              <button
                type="button"
                onClick={() => remove(r)}
                className="text-white/40 transition hover:text-rose-300"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CouponValidator />

      <CreateRewardDialog
        open={open}
        onClose={() => setOpen(false)}
        venueId={venueId}
        creating={create.isPending}
        onCreate={(body) =>
          create.mutate(body, {
            onSuccess: () => {
              toast.success('Recompensa creada');
              setOpen(false);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : 'No se pudo crear'),
          })
        }
      />
    </div>
  );
}

function CreateRewardDialog({
  open,
  onClose,
  venueId,
  creating,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  venueId: string;
  creating: boolean;
  onCreate: (body: CreateRewardBody) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [costNpp, setCostNpp] = React.useState(500);
  const [discountType, setDiscountType] = React.useState<'NONE' | 'PERCENT'>('NONE');
  const [discountValue, setDiscountValue] = React.useState(0);

  const applyTemplate = (t: Template) => {
    setTitle(t.title);
    setDescription(t.description);
    setCostNpp(t.costNpp);
    setDiscountType(t.discountType);
    setDiscountValue(t.discountValue);
  };

  const submit = () => {
    if (!title.trim() || costNpp < 1) {
      toast.error('Completa título y costo');
      return;
    }
    onCreate({
      venueId,
      kind: 'VENUE_PERK',
      title: title.trim(),
      description: description.trim() || undefined,
      costNpp,
      discountType,
      discountValue: discountType === 'PERCENT' ? discountValue : 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva recompensa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Plantillas
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15"
                >
                  {t.title} · {t.costNpp}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Trago de bienvenida" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Costo (NPP)</label>
              <Input
                type="number"
                value={costNpp}
                onChange={(e) => setCostNpp(Number(e.target.value))}
                min={1}
              />
            </div>
            {discountType === 'PERCENT' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">% descuento</label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={creating} className="gap-1.5">
            {creating && <Loader2 className="size-4 animate-spin" />}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Staff valida un cupón por código (escaneo con cámara: fase próxima). */
function CouponValidator() {
  const [code, setCode] = React.useState('');
  const validate = useValidateCoupon();

  const submit = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 6) {
      toast.error('Código inválido');
      return;
    }
    validate.mutate(c, {
      onSuccess: (res) => {
        toast.success(`✓ ${res.title} — ${res.customer}`);
        setCode('');
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : 'Cupón no válido'),
    });
  };

  return (
    <div className="rounded-[18px] border border-white/12 bg-white/[0.04] p-5">
      <h3 className="text-sm font-semibold">Validar cupón</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Pide al cliente su código y valídalo aquí.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código del cupón"
          className="font-mono uppercase tracking-widest"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button onClick={submit} disabled={validate.isPending} className="shrink-0 gap-1.5">
          {validate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : validate.isSuccess ? (
            <Check className="size-4" />
          ) : validate.isError ? (
            <X className="size-4" />
          ) : null}
          Validar
        </Button>
      </div>
    </div>
  );
}
