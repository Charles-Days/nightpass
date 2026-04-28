'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/core/components/ui/input';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';

export function UsersSearchFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = React.useState(params.get('search') ?? '');

  function applyParams(nextParams: URLSearchParams) {
    const qs = nextParams.toString();
    router.push(qs ? `${paths.adminUsers}?${qs}` : paths.adminUsers);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    const trimmed = value.trim();
    if (trimmed) next.set('search', trimmed);
    else next.delete('search');
    next.delete('page');
    applyParams(next);
  }

  function clear() {
    setValue('');
    const next = new URLSearchParams(params);
    next.delete('search');
    next.delete('page');
    applyParams(next);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por email o nombre"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button type="submit" variant="outline">
        Buscar
      </Button>
      {params.get('search') ? (
        <Button type="button" variant="ghost" onClick={clear}>
          <X className="size-4" />
          Limpiar
        </Button>
      ) : null}
    </form>
  );
}
