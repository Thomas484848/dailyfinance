'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoImage } from '@/components/logo-image';
import { cleanDisplayName, formatCurrency, formatMarketCap } from '@/lib/utils';

export interface StockRow {
  id: number;
  symbol: string;
  name: string | null;
  exchangeCode: string | null;
  country: string | null;
  currency: string | null;
  lastPrice: number | null;
  marketCap: number | null;
  sector: string | null;
  industry: string | null;
  logoUrl?: string | null;
}

interface StocksTableProps {
  data: StockRow[];
  onAddToWatchlist?: (stockId: number) => void;
  activeWatchlistId?: number | null;
  watchlistStockIds?: Set<number>;
}

export function StocksTable({
  data,
  onAddToWatchlist,
  activeWatchlistId,
  watchlistStockIds,
}: StocksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<StockRow>[] = [
    {
      id: 'logo',
      header: '',
      cell: ({ row }) => (
        <LogoImage
          src={row.original.logoUrl}
          name={row.original.name ?? row.original.symbol}
          symbol={row.original.symbol}
          size={28}
          loading="lazy"
        />
      ),
      size: 44,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            Nom
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{cleanDisplayName(row.original.name)}</div>
          <div className="text-xs text-muted-foreground">{row.original.industry ?? row.original.sector ?? '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'symbol',
      header: 'Ticker',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.symbol}</span>
      ),
    },
    {
      accessorKey: 'exchangeCode',
      header: 'Bourse',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.exchangeCode || 'N/A'}</div>
          {row.original.country && (
            <div className="text-xs text-muted-foreground">{row.original.country}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'lastPrice',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            Dernier prix
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.original.lastPrice, row.original.currency ?? 'USD')}
        </span>
      ),
    },
    {
      accessorKey: 'marketCap',
      header: 'Capitalisation',
      cell: ({ row }) => (
        <span className="text-sm">{formatMarketCap(row.original.marketCap ?? null)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const alreadyIn = watchlistStockIds?.has(row.original.id) ?? false;
        return (
          <Button
            variant={alreadyIn ? 'secondary' : 'default'}
            size="sm"
            disabled={!activeWatchlistId || alreadyIn || !onAddToWatchlist}
            onClick={() => onAddToWatchlist?.(row.original.id)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {alreadyIn ? 'Ajoute' : 'Ajouter'}
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/40">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  Aucun resultat trouve.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

