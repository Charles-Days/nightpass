'use client';

import { Check, X } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '../schemas/password';

/** Reglas espejo de `strongPassword` (schemas/password.ts) — única fuente de verdad. */
const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: `${PASSWORD_MIN_LENGTH}+ caracteres`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { label: 'Una mayúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Una minúscula', test: (v) => /[a-z]/.test(v) },
  { label: 'Un número', test: (v) => /[0-9]/.test(v) },
];

/**
 * Checklist en vivo de requisitos de contraseña. Muestra las reglas reales
 * desde el primer caracter para que el usuario no las descubra al ser rechazado.
 */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" aria-live="polite">
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li
            key={r.label}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${ok ? 'text-emerald-300' : 'text-white/40'}`}
          >
            {ok ? (
              <Check className="size-3 shrink-0" />
            ) : (
              <X className="size-3 shrink-0 text-white/25" />
            )}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
