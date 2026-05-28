'use client';

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive';

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-white/10 bg-[#0f0d18]/95 backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <div
            className={`mb-2 grid size-12 place-items-center rounded-full ${
              isDestructive
                ? 'border border-red-500/30 bg-red-500/10'
                : 'border border-primary/30 bg-primary/10'
            }`}
          >
            <AlertTriangle
              className={`size-5 ${isDestructive ? 'text-red-400' : 'text-primary'}`}
            />
          </div>
          <DialogTitle className="font-display text-xl font-bold tracking-tight text-white">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm text-white/65">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <DialogFooter className="mt-2 gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-50 sm:flex-none sm:px-5"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition active:scale-95 disabled:opacity-50 sm:flex-none sm:px-5 ${
              isDestructive
                ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_4px_18px_-4px_rgba(239,68,68,0.55)] hover:brightness-110'
                : 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:brightness-110'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Procesando…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
