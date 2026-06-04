'use client';

import * as React from 'react';
import { useRpList } from '@/features/rp/hooks/use-rp';
import { RpTable } from '@/features/rp/components/rp-table';
import { CreateRpDialog } from '@/features/rp/components/create-rp-dialog';
import { RpDetailSheet } from '@/features/rp/components/rp-detail-sheet';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Plus, Search } from 'lucide-react';

// Panel del organizador: gestiona sus propios RPs, les asigna eventos +
// comisión y consulta sus ventas. Todo scopeado a su organización vía el
// backend `/rp/promoter/mine`.
const BASE_PATH = '/api/rp/promoter/mine';

export default function MiOrganizadorRpsPage() {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedRpId, setSelectedRpId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useRpList(
    {
      search: debouncedSearch || undefined,
      page,
      limit,
    },
    BASE_PATH,
  );

  const handleViewDetail = (id: string) => {
    setSelectedRpId(id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Relaciones Públicas
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-white">
            Mis RPs
          </h1>
          <p className="text-sm text-muted-foreground">
            Da de alta a tus RPs, asígnales eventos y comisión, y comparte su
            link de referido para seguir sus ventas.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:brightness-110 text-white font-semibold flex items-center gap-1.5 h-10"
        >
          <Plus className="size-4" />
          Nuevo RP
        </Button>
      </header>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Buscar por nombre, código o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/[0.05] border-white/14 text-white rounded-xl h-10 pl-10 placeholder-white/30 text-sm focus:border-primary/50"
        />
      </div>

      {/* Table Section */}
      <div className="mt-4">
        <RpTable
          rps={data?.items || []}
          isLoading={isLoading}
          onViewDetail={handleViewDetail}
          basePath={BASE_PATH}
        />
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            {data.total} RPs en total · página {data.page}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              variant="outline"
              className="rounded-lg h-8 text-xs border-white/14 text-white hover:bg-white/5"
            >
              Anterior
            </Button>
            <Button
              disabled={page * limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
              variant="outline"
              className="rounded-lg h-8 text-xs border-white/14 text-white hover:bg-white/5"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs & Sheets */}
      <CreateRpDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        basePath={BASE_PATH}
        scope="promoter"
      />
      <RpDetailSheet
        rpId={selectedRpId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        basePath={BASE_PATH}
      />
    </div>
  );
}
