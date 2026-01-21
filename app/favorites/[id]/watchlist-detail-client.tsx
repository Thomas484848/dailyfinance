"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { StocksTable, type StockRow } from '@/components/stocks-table';
import { apiFetch } from '@/lib/api-client';
import { ChevronDown } from 'lucide-react';

type WatchlistItem = {
  id: number;
  stock: {
    id: number;
    symbol: string;
    name: string | null;
    exchangeCode: string | null;
    currency?: string | null;
    country?: string | null;
    sector?: string | null;
    industry?: string | null;
    logoUrl?: string | null;
    lastPrice?: number | null;
    marketCap?: number | null;
  } | null;
};

type Watchlist = {
  id: number;
  name: string;
  isDefault: boolean;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  color?: string | null;
  coverImage?: string | null;
};

export default function WatchlistDetailClient() {
  const router = useRouter();
  const params = useParams();
  const watchlistId = Number(params.id);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const maxDescriptionLength = 200;
  const [isEditingAppearance, setIsEditingAppearance] = useState(false);
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const [draftCoverImage, setDraftCoverImage] = useState<string | null | undefined>(undefined);
  const colorOptions: Record<string, { chip: string; cover: string }> = {
    emerald: { chip: 'bg-emerald-500', cover: 'from-emerald-500/30 via-emerald-400/10 to-transparent' },
    blue: { chip: 'bg-blue-500', cover: 'from-blue-500/30 via-sky-400/10 to-transparent' },
    amber: { chip: 'bg-amber-500', cover: 'from-amber-500/30 via-yellow-400/10 to-transparent' },
    rose: { chip: 'bg-rose-500', cover: 'from-rose-500/30 via-pink-400/10 to-transparent' },
    indigo: { chip: 'bg-indigo-500', cover: 'from-indigo-500/30 via-violet-400/10 to-transparent' },
    cyan: { chip: 'bg-cyan-500', cover: 'from-cyan-500/30 via-teal-400/10 to-transparent' },
    lime: { chip: 'bg-lime-500', cover: 'from-lime-500/30 via-green-400/10 to-transparent' },
    orange: { chip: 'bg-orange-500', cover: 'from-orange-500/30 via-amber-400/10 to-transparent' },
  };

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

  useEffect(() => {
    if (!token || !watchlistId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/watchlists/${watchlistId}`);
        if (!res.ok) throw new Error('Watchlist introuvable');
        const data = await res.json();
        const wl = data as Watchlist;
        setWatchlist(wl);
        setEditingName(wl.name ?? '');
        setEditingDescription(wl.description ?? '');
        setDraftColor(wl.color ?? null);
        setDraftCoverImage(undefined);
        const itemsRes = await apiFetch(`/api/watchlists/${watchlistId}/items`);
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          const rawItems = (itemsData.items ?? []) as WatchlistItem[];
          setItems(rawItems);
        } else {
          setItems([]);
        }
      } catch {
        setWatchlist(null);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, watchlistId]);

  const tableRows: StockRow[] = useMemo(
    () =>
      items
        .filter((item) => item.stock)
        .map((item) => {
          const id = item.stock!.id;
          return {
            id,
            symbol: item.stock!.symbol,
            name: item.stock!.name,
            exchangeCode: item.stock!.exchangeCode,
            country: item.stock!.country ?? null,
            currency: item.stock!.currency ?? null,
            lastPrice: item.stock!.lastPrice ?? null,
            marketCap: item.stock!.marketCap ?? null,
            sector: item.stock!.sector ?? null,
            industry: item.stock!.industry ?? null,
            logoUrl: item.stock!.logoUrl ?? null,
          };
        }),
    [items]
  );

  const handleRemove = async (stockId: number) => {
    const item = items.find((entry) => entry.stock?.id === stockId);
    if (!item) return;
    try {
      const res = await apiFetch(`/api/watchlists/${watchlistId}/items/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Suppression impossible');
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch {
      // ignore
    }
  };

  const handleSaveName = async () => {
    if (!watchlist) return;
    const name = editingName.trim();
    if (!name || name === watchlist.name) {
      setIsEditingName(false);
      setEditingName(watchlist.name);
      return;
    }
    try {
      const res = await apiFetch(`/api/watchlists/${watchlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Update impossible');
      setWatchlist((prev) => (prev ? { ...prev, name } : prev));
      setIsEditingName(false);
    } catch {
      // ignore
    }
  };

  const handleSaveDescription = async () => {
    if (!watchlist) return;
    const description = editingDescription.trim().slice(0, maxDescriptionLength);
    if (!description) {
      setIsEditingDescription(false);
      setEditingDescription(watchlist.description ?? '');
      return;
    }
    if (description === (watchlist.description ?? '')) {
      setIsEditingDescription(false);
      return;
    }
    try {
      const res = await apiFetch(`/api/watchlists/${watchlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error('Update impossible');
      setWatchlist((prev) => (prev ? { ...prev, description } : prev));
      setIsEditingDescription(false);
    } catch {
      // ignore
    }
  };

  const resolveColorKey = (list: Watchlist) => {
    if (list.color && colorOptions[list.color]) return list.color;
    if (list.isDefault) return 'amber';
    const keys = Object.keys(colorOptions);
    return keys[Math.abs(list.id) % keys.length];
  };

  const applyAppearance = async () => {
    if (!watchlist) return;
    const color = draftColor ?? null;
    const coverImage = draftCoverImage ?? null;
    const payload: { color?: string | null; coverImage?: string | null } = {};
    if (color !== (watchlist.color ?? null)) payload.color = color;
    if (coverImage !== (watchlist.coverImage ?? null)) payload.coverImage = coverImage;
    if (!Object.keys(payload).length) {
      setIsEditingAppearance(false);
      return;
    }
    try {
      const res = await apiFetch(`/api/watchlists/${watchlist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update impossible');
      setWatchlist((prev) =>
        prev ? { ...prev, color: payload.color ?? prev.color, coverImage: payload.coverImage ?? prev.coverImage } : prev
      );
      setIsEditingAppearance(false);
    } catch {
      // ignore
    }
  };

  if (token === undefined) return null;
  if (!token) return null;

  const colorKey = watchlist ? resolveColorKey({ ...watchlist, color: draftColor ?? watchlist.color }) : 'amber';
  const coverClass = colorOptions[colorKey]?.cover ?? 'from-amber-500/30 via-yellow-400/10 to-transparent';
  const coverImage =
    draftCoverImage === undefined ? watchlist?.coverImage ?? null : draftCoverImage;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {watchlist?.name ?? 'Watchlist'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {items.length} actions • {watchlist?.isDefault ? 'Favoris' : 'Watchlist'}
          </p>
          {watchlist && (
            <div className="mt-3 max-w-2xl">
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    className="min-h-[84px] w-full rounded-md border border-input bg-background p-3 text-sm"
                    value={editingDescription}
                    onChange={(event) =>
                      setEditingDescription(event.target.value.slice(0, maxDescriptionLength))
                    }
                    placeholder="Ajouter une description"
                  />
                  <div className="text-xs text-muted-foreground">
                    {editingDescription.length}/{maxDescriptionLength}
                  </div>
                  <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDescription}
                    disabled={editingDescription.trim().length === 0}
                  >
                    Enregistrer
                  </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingDescription(false);
                        setEditingDescription(watchlist.description ?? '');
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {watchlist.description ?? 'Aucune description.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(true)}>
                    Modifier
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/favorites">Retour aux watchlists</Link>
          </Button>
        </div>
      </div>

      {watchlist && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Nom</div>
            {isEditingName && !watchlist.isDefault ? (
              <div className="mt-2 space-y-2">
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveName}>
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditingName(watchlist.name);
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{watchlist.name}</div>
                {!watchlist.isDefault && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingName(true)}>
                    Modifier
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Type</div>
            <div className="text-sm font-semibold">{watchlist.isDefault ? 'Favoris' : 'Personnalisee'}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Creee le</div>
            <div className="text-sm font-semibold">
              {watchlist.createdAt ? new Date(watchlist.createdAt).toLocaleDateString('fr-FR') : '—'}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Mise a jour</div>
            <div className="text-sm font-semibold">
              {watchlist.updatedAt ? new Date(watchlist.updatedAt).toLocaleDateString('fr-FR') : '—'}
            </div>
          </div>
        </div>
      )}

      {watchlist && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Apparence
              </div>
              <div className="text-sm text-white">
                Couleur et cover de la watchlist
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.preventDefault();
                  setIsEditingAppearance((prev) => !prev);
                  setDraftColor(watchlist.color ?? null);
                  setDraftCoverImage(undefined);
                }}
              >
                Modifier
              </Button>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </summary>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Couleur</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(colorOptions).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setIsEditingAppearance(true);
                      setDraftColor(color);
                    }}
                    className={`h-8 w-8 rounded-md ${colorOptions[color].chip} ${
                      colorKey === color ? 'ring-2 ring-white/80' : 'ring-1 ring-white/10'
                    }`}
                    aria-label="Couleur"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Cover</div>
              </div>
              <div
                className={`mt-2 h-20 w-full rounded-md ${
                  coverImage ? '' : `bg-gradient-to-r ${coverClass}`
                }`}
                style={
                  coverImage
                    ? {
                        backgroundImage: `url(${coverImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-muted-foreground"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setIsEditingAppearance(true);
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : null;
                      if (!result) return;
                      setDraftCoverImage(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {coverImage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingAppearance(true);
                      setDraftCoverImage(null);
                    }}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isEditingAppearance && (
            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={applyAppearance}>
                Appliquer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditingAppearance(false);
                  setDraftColor(watchlist.color ?? null);
                  setDraftCoverImage(undefined);
                }}
              >
                Annuler
              </Button>
            </div>
          )}
        </details>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : !watchlist ? (
        <EmptyState
          title="Watchlist introuvable"
          description="Cette watchlist n'existe pas ou n'est pas accessible."
        />
      ) : tableRows.length === 0 ? (
        <EmptyState
          title="Aucune action"
          description="Ajoutez des actions depuis le dashboard."
        />
      ) : (
        <StocksTable
          data={tableRows}
          onRemoveFromWatchlist={handleRemove}
          activeWatchlistId={watchlistId}
          watchlistStockIds={new Set(tableRows.map((row) => row.id))}
        />
      )}
    </div>
  );
}
