"use client";
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StocksTable, type StockRow } from '@/components/stocks-table';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/table-skeleton';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/hooks/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type WatchlistItem = {
  id: number;
  stockId: number;
};

type Watchlist = {
  id: number;
  name: string;
  isDefault: boolean;
  color?: string | null;
  coverImage?: string | null;
};

function HomePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 30;
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchlistCounts, setWatchlistCounts] = useState<Record<number, number>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      const tokenValue = window.localStorage.getItem('jwt_token');
      setToken(tokenValue);
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (token === null) {
      router.replace('/login');
    }
  }, [router, token]);

  const mapStock = (stock: any): StockRow => {
    return {
      id: typeof stock.id === 'number' ? stock.id : Number(stock.id),
      symbol: stock.symbol ?? '',
      name: stock.name ?? null,
      exchangeCode: stock.exchangeCode ?? stock.exchange ?? null,
      country: stock.country ?? null,
      currency: stock.currency ?? null,
      lastPrice: stock.lastPrice ?? stock.price ?? null,
      marketCap: stock.marketCap ?? null,
      sector: stock.sector ?? null,
      industry: stock.industry ?? null,
      logoUrl: stock.logoUrl ?? null,
    };
  };

  async function fetchStocks() {
    setLoading(true);
    setLoadError(null);
    try {
      const query = `?page=${page}&itemsPerPage=${itemsPerPage}`;
      const stocksRes = await apiFetch(`/api/stocks${query}`);
      if (!stocksRes.ok) {
        let message = `Erreur chargement stocks (${stocksRes.status})`;
        try {
          const data = await stocksRes.json();
          if (data?.message) message = String(data.message);
        } catch {
          // ignore
        }
        if (stocksRes.status === 401) {
          message = 'Session expiree. Reconnectez-vous.';
        }
        throw new Error(message);
      }
      const stocksData = await stocksRes.json();
      const member = Array.isArray(stocksData.member)
        ? stocksData.member
        : Array.isArray(stocksData['hydra:member'])
        ? stocksData['hydra:member']
        : null;
      if (member) {
        const items = member.map(mapStock);
        setStocks(items);
        const total =
          typeof stocksData.totalItems === 'number'
            ? stocksData.totalItems
            : typeof stocksData['hydra:totalItems'] === 'number'
            ? stocksData['hydra:totalItems']
            : items.length;
        setTotalItems(total);
        const view = stocksData.view ?? stocksData['hydra:view'];
        const lastLink = view?.last ?? view?.['hydra:last'];
        if (lastLink) {
          const last = new URL(lastLink, window.location.origin);
          const lastPage = Number(last.searchParams.get('page') ?? 1);
          setTotalPages(lastPage || 1);
        } else {
          setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
        }
      } else {
        setStocks(stocksData.stocks || []);
        if (stocksData.pagination?.totalPages) {
          setTotalPages(stocksData.pagination.totalPages);
        } else {
          setTotalPages(1);
        }
        if (typeof stocksData.pagination?.total === 'number') {
          setTotalItems(stocksData.pagination.total);
        } else {
          setTotalItems(0);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setLoadError(message);
      toast({
        title: 'Erreur de chargement',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchStocks();
  }, [token, page]);

  useEffect(() => {
    if (!token) return;
    const loadWatchlists = async () => {
      try {
        const res = await apiFetch('/api/watchlists');
        if (!res.ok) return;
        let lists = ((await res.json()).watchlists ?? []) as Watchlist[];
        const hasDefault = lists.some((list) => list.isDefault);
        if (!lists.length || !hasDefault) {
          const created = await apiFetch('/api/watchlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Favoris', isDefault: true, color: 'amber' }),
          });
          if (created.ok) {
            const refreshed = await apiFetch('/api/watchlists');
            if (refreshed.ok) {
              lists = ((await refreshed.json()).watchlists ?? []) as Watchlist[];
            }
          }
        }
        const sorted = [...lists].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
        setWatchlists(sorted);
        setActiveWatchlistId((current) => current ?? (sorted[0]?.id ?? null));
        const countEntries = await Promise.all(
          sorted.map(async (list) => {
            const itemsRes = await apiFetch(`/api/watchlists/${list.id}/items`);
            if (!itemsRes.ok) return [list.id, 0] as const;
            const data = await itemsRes.json();
            const items = (data.items ?? []) as Array<unknown>;
            return [list.id, items.length] as const;
          })
        );
        setWatchlistCounts(Object.fromEntries(countEntries));
      } catch {
        // ignore
      }
    };
    loadWatchlists();
  }, [token]);

  const handleCreateWatchlist = async () => {
    const name = newWatchlistName.trim();
    if (!name) return;
    try {
      const res = await apiFetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Creation impossible');
      const created = (await res.json()) as Watchlist;
      const next = [...watchlists, created].sort(
        (a, b) => Number(b.isDefault) - Number(a.isDefault)
      );
      setWatchlists(next);
      setActiveWatchlistId(created.id ?? null);
      setWatchlistCounts((prev) => ({ ...prev, [created.id]: 0 }));
      setNewWatchlistName('');
      setIsCreateOpen(false);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!token || !activeWatchlistId) return;
    const loadItems = async () => {
      try {
        const res = await apiFetch(`/api/watchlists/${activeWatchlistId}/items`);
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items ?? []) as Array<{
          id: number;
          stock: { id: number } | null;
        }>;
        setWatchlistItems(
          items
            .filter((item) => item.stock && typeof item.stock.id === 'number')
            .map((item) => ({ id: item.id, stockId: item.stock!.id }))
        );
        setWatchlistCounts((prev) => ({
          ...prev,
          [activeWatchlistId]: items.length,
        }));
      } catch {
        // ignore
      }
    };
    loadItems();
  }, [token, activeWatchlistId]);

  const watchlistStockIds = new Set(watchlistItems.map((item) => item.stockId));

  const handleAddToWatchlist = async (stockId: number) => {
    if (!activeWatchlistId) return;
    try {
      const res = await apiFetch(`/api/watchlists/${activeWatchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId }),
      });
      if (!res.ok) throw new Error('Ajout impossible');
      const data = await res.json();
      const itemId = typeof data.id === 'number' ? data.id : null;
      setWatchlistItems((prev) =>
        prev.some((item) => item.stockId === stockId)
          ? prev
          : [...prev, { id: itemId ?? Date.now(), stockId }]
      );
      toast({ title: 'Ajoute a la watchlist' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages || 1);
    }
  }, [page, totalPages]);

  if (token === undefined) {
    return null;
  }
  if (!token) {
    return null;
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-white">
            Analysez une action en quelques secondes.
          </h1>
          <p className="text-xs text-muted-foreground">
            Recherchez une action, consultez ses donnees clefs, puis ouvrez la fiche detaillee pour
            aller plus loin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a href="#stocks">Parcourir les actions</a>
          </Button>
          {watchlists.length > 0 && (
            <div className="min-w-[180px]">
              <Select
                value={activeWatchlistId ? String(activeWatchlistId) : undefined}
                onValueChange={(value) => {
                  if (value === '__create__') {
                    setIsCreateOpen(true);
                    return;
                  }
                  setActiveWatchlistId(Number(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une watchlist" />
                </SelectTrigger>
                <SelectContent>
                  {watchlists.map((list) => (
                    <SelectItem key={list.id} value={String(list.id)}>
                      {list.name}
                      {typeof watchlistCounts[list.id] === 'number'
                        ? ` (${watchlistCounts[list.id]})`
                        : ''}
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="__create__"
                  >
                    + Creer une watchlist
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <section id="stocks">
        <div className="flex flex-row items-start justify-between gap-4">
        </div>
        {totalPages > 1 && (
          <Pagination className="mb-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#stocks"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.max(1, prev - 1));
                  }}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#stocks"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        <div>
          {loading ? (
            <TableSkeleton />
          ) : loadError ? (
            <EmptyState
              title="Erreur de chargement"
              description={loadError}
            />
          ) : stocks.length === 0 ? (
            <EmptyState
              title="Aucune action disponible"
              description="L'import des actions n'a pas encore ete lance."
            />
          ) : (
            <StocksTable
              data={stocks}
              onAddToWatchlist={handleAddToWatchlist}
              activeWatchlistId={activeWatchlistId}
              watchlistStockIds={watchlistStockIds}
            />
          )}
        </div>
        {totalPages > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#stocks"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.max(1, prev - 1));
                  }}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#stocks"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          {totalItems} actions au total
        </div>
      </section>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle watchlist</DialogTitle>
            <DialogDescription>
              Donne un nom a ta watchlist (ex: US Technologie).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newWatchlistName}
            onChange={(event) => setNewWatchlistName(event.target.value)}
            placeholder="Nom de la watchlist"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateWatchlist} disabled={!newWatchlistName.trim()}>
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
