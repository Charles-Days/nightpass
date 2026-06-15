'use client';

import * as React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/core/components/ui/input';
import { cn } from '@/core/lib/utils/cn';

type PasswordInputProps = React.ComponentPropsWithoutRef<typeof Input>;

/**
 * Campo de contraseña con icono de candado a la izquierda y botón "ojito"
 * para mostrar/ocultar. Reduce typos en móvil. Pensado para usarse con
 * `{...register('password')}` de react-hook-form (el ref viaja en el spread).
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40 transition-colors" />
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn('pl-10 pr-12', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={show}
          tabIndex={-1}
          className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-white/40 transition-colors hover:text-white/80 active:scale-95 transform-gpu"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
