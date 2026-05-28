'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { formatRemaining } from '../lib/media-utils';

interface CountdownPillProps {
  expiresAt: string;
}

export function CountdownPill({ expiresAt }: CountdownPillProps) {
  const [label, setLabel] = React.useState(() => formatRemaining(expiresAt));

  React.useEffect(() => {
    setLabel(formatRemaining(expiresAt));
    const id = setInterval(() => {
      setLabel(formatRemaining(expiresAt));
    }, 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
      <Clock className="size-3" />
      {label}
    </span>
  );
}
