"use client";
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FilterBar } from '@/components/filter-bar';
import { StocksTable } from '@/components/stocks-table';
import type { StockRow } from '@/components/stocks-table';
import { Pagination } from '@/components/pagination';
import { TableSkeleton } from '@/components/table-skeleton';
import { EmptyState } from '@/components/empty-state';
import { apiFetch } from '@/lib/api-client';

function HomePage() {
  const searchParams = useSearchParams();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    itemsPerPage: 20,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStocks() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const queryValue = searchParams.get('query');
        if (queryValue) params.set('query', queryValue);
        if (searchParams.get('country')) params.set('country', searchParams.get('country')!);
        if (searchParams.get('exchange')) params.set('exchange', searchParams.get('exchange')!);
        if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
        if (searchParams.get('page')) params.set('page', searchParams.get('page')!);
        if (!queryValue && !params.has('reliableOnly')) params.set('reliableOnly', '1');

        const res = await apiFetch(`/api/stocks?${params.toString()}`);

        if (!res.ok) {
          throw new Error('Erreur lors du chargement des donnees');
        }

        const data = await res.json();
        setStocks(data.stocks || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0, itemsPerPage: 20 });
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setStocks([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStocks();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Radar Boursier</h1>
        <p className="text-muted-foreground">
          Comparez les actions en un clin d&apos;oeil avec prix, valorisation et ratios cles.
        </p>
      </div>

      <FilterBar />

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifiez que la base de donnees est configuree et que les donnees sont importees.
          </p>
        </div>
      ) : stocks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <StocksTable data={stocks} />
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.itemsPerPage}
          />
        </>
      )}
    </div>
  );
}

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePage />
    </Suspense>
  );
}

