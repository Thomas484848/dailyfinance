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
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { LogoImage } from '@/components/logo-image';
import { cleanDisplayName, formatCurrency, formatMarketCap, formatNumber } from '@/lib/utils';
import { ValuationStatus } from '@/lib/types';

export interface StockRow {
  id: string;
  symbol: string;
  name: string;
  isin: string | null;
  exchange: string | null;
  country: string | null;
  logoUrl?: string | null;
  price: number | null;
  marketCap?: number | null;
  peCurrent: number | null;
  peAvg: number | null;
  status: ValuationStatus;
}

interface StocksTableProps {
  data: StockRow[];
}

export function StocksTable({ data }: StocksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<StockRow>[] = [
    {
      id: 'logo',
      header: '',
      cell: ({ row }) => {
        return (
          <LogoImage
            src={row.original.logoUrl}
            name={row.original.name}
            symbol={row.original.symbol}
            size={32}
            loading="lazy"
          />
        );
      },
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
        <Link
          href={{
            pathname: `/stock/${row.original.symbol}`,
            query: row.original.exchange ? { exchange: row.original.exchange } : {},
          }}
          className="font-medium hover:underline"
        >
          {cleanDisplayName(row.original.name)}
        </Link>
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
      accessorKey: 'exchange',
      header: 'Bourse',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.exchange || 'N/A'}</div>
          {row.original.country && (
            <div className="text-xs text-muted-foreground">{row.original.country}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            Prix
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
        <span className="font-medium">{formatCurrency(row.original.price)}</span>
      ),
    },
    {
      accessorKey: 'marketCap',
      header: 'Capitalisation',
      cell: ({ row }) => (
        <span className="text-sm">{formatMarketCap(row.original.marketCap)}</span>
      ),
    },
    {
      accessorKey: 'peCurrent',
      header: 'PER Actuel',
      cell: ({ row }) => (
        <span className="text-sm">{formatNumber(row.original.peCurrent)}</span>
      ),
    },
    {
      accessorKey: 'peAvg',
      header: 'PER Moyen',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatNumber(row.original.peAvg)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            Statut
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
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
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
                  className="border-b transition-colors hover:bg-muted/50"
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

