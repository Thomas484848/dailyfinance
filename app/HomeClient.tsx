"use client";
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StocksTable, type StockRow } from '@/components/stocks-table';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

type Watchlist = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
};

type WatchlistItem = {
  id: number;
  watchlistId: number;
  stock: {
    id: number;
    symbol: string;
    name: string | null;
    exchangeCode: string | null;
  } | null;
  addedAt: string;
  position: number | null;
  note: string | null;
  tags: string[] | null;
  alertPriceAbove: string | null;
  alertPriceBelow: string | null;
};

function HomePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlistForm, setWatchlistForm] = useState({
    name: '',
    description: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState({
    note: '',
    alertPriceAbove: '',
    alertPriceBelow: '',
    tags: '',
  });

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

  const watchlistStockIds = useMemo(() => {
    return new Set(
      watchlistItems
        .map((item) => item.stock?.id)
        .filter((id): id is number => typeof id === 'number')
    );
  }, [watchlistItems]);


  async function fetchStocksAndWatchlists() {
    setLoading(true);
    try {
      const [stocksRes, watchlistsRes] = await Promise.all([
        apiFetch('/api/stocks'),
        apiFetch('/api/watchlists'),
      ]);
      if (!stocksRes.ok) throw new Error('Erreur chargement stocks');
      if (!watchlistsRes.ok) throw new Error('Erreur chargement watchlists');
      const stocksData = await stocksRes.json();
      const watchlistsData = await watchlistsRes.json();
      setStocks(stocksData.stocks || []);
      setWatchlists(watchlistsData.watchlists || []);
      if (!activeWatchlistId && watchlistsData.watchlists?.length) {
        setActiveWatchlistId(watchlistsData.watchlists[0].id);
      }
    } catch (error) {
      toast({
        title: 'Erreur de chargement',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchWatchlistItems(watchlistId: number) {
    try {
      const res = await apiFetch(`/api/watchlists/${watchlistId}/items`);
      if (!res.ok) throw new Error('Erreur chargement watchlist');
      const data = await res.json();
      setWatchlistItems(data.items || []);
    } catch (error) {
      toast({
        title: 'Erreur watchlist',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchStocksAndWatchlists();
  }, [token]);

  useEffect(() => {
    if (!activeWatchlistId) return;
    fetchWatchlistItems(activeWatchlistId);
  }, [activeWatchlistId]);

  async function createWatchlist() {
    if (!watchlistForm.name.trim()) {
      toast({ title: 'Nom requis', variant: 'destructive' });
      return;
    }
    try {
      const res = await apiFetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: watchlistForm.name.trim(),
          description: watchlistForm.description.trim() || null,
          isDefault: watchlists.length === 0,
        }),
      });
      if (!res.ok) throw new Error('Creation impossible');
      const data = await res.json();
      const next = [...watchlists, data];
      setWatchlists(next);
      setWatchlistForm({ name: '', description: '' });
      setActiveWatchlistId(data.id);
      setDialogOpen(false);
      toast({ title: 'Watchlist creee' });
    } catch (error) {
      toast({
        title: 'Erreur creation',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  }

  async function deleteWatchlist(id: number) {
    try {
      const res = await apiFetch(`/api/watchlists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Suppression impossible');
      const next = watchlists.filter((wl) => wl.id !== id);
      setWatchlists(next);
      if (activeWatchlistId === id) {
        setActiveWatchlistId(next[0]?.id ?? null);
        setWatchlistItems([]);
      }
      toast({ title: 'Watchlist supprimee' });
    } catch (error) {
      toast({
        title: 'Erreur suppression',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  }

  async function addStockToWatchlist(stockId: number) {
    if (!activeWatchlistId) return;
    try {
      const res = await apiFetch(`/api/watchlists/${activeWatchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId }),
      });
      if (!res.ok) throw new Error('Ajout impossible');
      const data = await res.json();
      setWatchlistItems((prev) => [...prev, data]);
      toast({ title: 'Action ajoutee a la watchlist' });
    } catch (error) {
      toast({
        title: 'Erreur ajout',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  }

  async function removeItem(itemId: number) {
    if (!activeWatchlistId) return;
    try {
      const res = await apiFetch(`/api/watchlists/${activeWatchlistId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Suppression impossible');
      setWatchlistItems((prev) => prev.filter((item) => item.id !== itemId));
      if (editingItemId === itemId) setEditingItemId(null);
    } catch (error) {
      toast({
        title: 'Erreur suppression',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  }

  async function saveItemChanges() {
    if (!activeWatchlistId || editingItemId === null) return;
    try {
      const payload = {
        note: itemDraft.note || null,
        alertPriceAbove: itemDraft.alertPriceAbove || null,
        alertPriceBelow: itemDraft.alertPriceBelow || null,
        tags: itemDraft.tags ? itemDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : null,
      };
      const res = await apiFetch(`/api/watchlists/${activeWatchlistId}/items/${editingItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Mise a jour impossible');
      const data = await res.json();
      setWatchlistItems((prev) => prev.map((item) => (item.id === editingItemId ? data : item)));
      toast({ title: 'Item mis a jour' });
    } catch (error) {
      toast({
        title: 'Erreur modification',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  }

  if (token === undefined) {
    return null;
  }
  if (!token) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Suivez vos watchlists et ajoutez rapidement des actions.
          </p>
        </div>
        <Card className="flex items-center gap-4 px-4 py-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Actions suivies</p>
            <p className="text-lg font-semibold">{watchlistItems.length}</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs uppercase text-muted-foreground">Stocks disponibles</p>
            <p className="text-lg font-semibold">{stocks.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="p-4 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Watchlists</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle watchlist</DialogTitle>
                  <DialogDescription>
                    Donnez un nom clair a votre watchlist.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Nom"
                    value={watchlistForm.name}
                    onChange={(event) =>
                      setWatchlistForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Description (optionnel)"
                    value={watchlistForm.description}
                    onChange={(event) =>
                      setWatchlistForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createWatchlist}>Creer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {watchlists.map((watchlist) => (
              <button
                key={watchlist.id}
                onClick={() => setActiveWatchlistId(watchlist.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  activeWatchlistId === watchlist.id
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{watchlist.name}</p>
                    {watchlist.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {watchlist.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteWatchlist(watchlist.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs uppercase text-muted-foreground">
              Nouvelle watchlist
            </p>
            <Button variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
              Creer une watchlist
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Contenu de la watchlist</h2>
                <p className="text-sm text-muted-foreground">
                  {activeWatchlistId
                    ? 'Cliquez sur une action pour modifier les alertes.'
                    : 'Selectionnez une watchlist.'}
                </p>
              </div>
            </div>

            {watchlistItems.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">
                Aucune action pour le moment.
              </p>
            ) : (
              <div className="grid gap-3 mt-4">
                {watchlistItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 transition ${
                      editingItemId === item.id ? 'border-primary bg-primary/5' : 'bg-background'
                    }`}
                    onClick={() => {
                      setEditingItemId(item.id);
                      setItemDraft({
                        note: item.note ?? '',
                        alertPriceAbove: item.alertPriceAbove ?? '',
                        alertPriceBelow: item.alertPriceBelow ?? '',
                        tags: item.tags?.join(', ') ?? '',
                      });
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {item.stock?.name ?? item.stock?.symbol ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.stock?.symbol ?? '—'} {item.stock?.exchangeCode ? `· ${item.stock.exchangeCode}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.note && (
                      <p className="text-xs text-muted-foreground mt-2">{item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {editingItemId && (
              <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">Modifier l&apos;item</p>
                <Input
                  placeholder="Note"
                  value={itemDraft.note}
                  onChange={(event) =>
                    setItemDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Alerte au-dessus"
                    value={itemDraft.alertPriceAbove}
                    onChange={(event) =>
                      setItemDraft((prev) => ({ ...prev, alertPriceAbove: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Alerte en dessous"
                    value={itemDraft.alertPriceBelow}
                    onChange={(event) =>
                      setItemDraft((prev) => ({ ...prev, alertPriceBelow: event.target.value }))
                    }
                  />
                </div>
                <Input
                  placeholder="Tags (ex: long, tech)"
                  value={itemDraft.tags}
                  onChange={(event) =>
                    setItemDraft((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={saveItemChanges}>Sauvegarder</Button>
                  <Button variant="ghost" onClick={() => setEditingItemId(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Stocks disponibles</h2>
                <p className="text-sm text-muted-foreground">
                  {activeWatchlistId
                    ? 'Ajoutez des actions a la watchlist selectionnee.'
                    : 'Selectionnez une watchlist pour ajouter des actions.'}
                </p>
              </div>
            </div>

            {loading ? (
              <Card className="p-6 text-sm text-muted-foreground">Chargement...</Card>
            ) : (
              <StocksTable
                data={stocks}
                activeWatchlistId={activeWatchlistId}
                onAddToWatchlist={addStockToWatchlist}
                watchlistStockIds={watchlistStockIds}
              />
            )}
          </div>
        </div>
      </div>
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

