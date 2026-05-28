'use client';

import * as React from 'react';
import { Loader2, Star } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';

const REASON_PRESETS = [
  { value: 'paid', label: 'Pagaron promoción' },
  { value: 'friend', label: 'Conocido / amigo' },
  { value: 'launch', label: 'Lanzamiento nuevo' },
  { value: 'editor', label: 'Pick editorial' },
  { value: 'other', label: 'Otro motivo' },
];

interface FeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
}

export function FeatureDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  onConfirm,
}: FeatureDialogProps) {
  const [preset, setPreset] = React.useState<string>('paid');
  const [custom, setCustom] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setPreset('paid');
      setCustom('');
    }
  }, [open]);

  const handleSubmit = () => {
    const presetLabel = REASON_PRESETS.find((r) => r.value === preset)?.label ?? '';
    const reason =
      preset === 'other'
        ? custom.trim() || 'Otro motivo'
        : custom.trim()
          ? `${presetLabel} — ${custom.trim()}`
          : presetLabel;
    onConfirm(reason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="size-4 fill-amber-300 text-amber-300" />
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {REASON_PRESETS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    preset === r.value
                      ? 'border-primary/60 bg-primary/10 text-foreground'
                      : 'border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={preset === r.value}
                    onChange={() => setPreset(r.value)}
                    className="accent-primary"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nota interna {preset === 'other' ? '(requerida)' : '(opcional)'}
            </p>
            <Input
              placeholder="Ej. acuerdo con Juan, vence 30/06"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || (preset === 'other' && !custom.trim())}
            onClick={handleSubmit}
            className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
            Destacar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
