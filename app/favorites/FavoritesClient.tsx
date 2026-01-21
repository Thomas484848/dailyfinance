"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { FolderHeart, ListMusic, Music, Star, Trash2, Pencil, Check } from 'lucide-react';

type Watchlist = {
  id: number;
  name: string;
  isDefault: boolean;
  color?: string | null;
  coverImage?: string | null;
};

export default function FavoritesClient() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [watchlistCounts, setWatchlistCounts] = useState<Record<number, number>>({});
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

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

  const iconPalette = [FolderHeart, ListMusic, Music, Star];

  const resolveColorKey = (list: Watchlist) => {
    if (list.color && colorOptions[list.color]) return list.color;
    if (list.isDefault) return 'amber';
    const keys = Object.keys(colorOptions);
    return keys[Math.abs(list.id) % keys.length];
  };

  const getIconFor = (id: number, isDefault: boolean) => {
    if (isDefault) return Star;
    return iconPalette[Math.abs(id) % iconPalette.length];
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

  // no local meta storage; appearance is persisted via API

  useEffect(() => {
    if (token === null) {
      router.replace('/login');
    }
  }, [router, token]);

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

  if (token === undefined) {
    return null;
  }
  if (!token) {
    return null;
  }

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const res = await apiFetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Creation impossible');
      const data = await res.json();
      const created = data as Watchlist;
      setWatchlists((prev) => [created, ...prev]);
      setActiveWatchlistId(created.id ?? null);
      setWatchlistCounts((prev) => ({ ...prev, [created.id]: 0 }));
      setNewName('');
    } catch {
      // ignore
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (list: Watchlist) => {
    setEditingId(list.id);
    setEditingName(list.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (list: Watchlist) => {
    const name = editingName.trim();
    if (!name || name === list.name) {
      handleCancelEdit();
      return;
    }
    try {
      const res = await apiFetch(`/api/watchlists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Update impossible');
      setWatchlists((prev) =>
        prev.map((item) => (item.id === list.id ? { ...item, name } : item))
      );
      handleCancelEdit();
    } catch {
      // ignore
    }
  };

  const handleDeleteWatchlist = async (list: Watchlist) => {
    if (list.isDefault) return;
    const confirmed = window.confirm(
      `Supprimer la watchlist "${list.name}" ? Cette action est definitive.`
    );
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/watchlists/${list.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Suppression impossible');
      setWatchlists((prev) => {
        const remaining = prev.filter((item) => item.id !== list.id);
        if (activeWatchlistId === list.id) {
          setActiveWatchlistId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
      setWatchlistCounts((prev) => {
        const next = { ...prev };
        delete next[list.id];
        return next;
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-white">Favoris</h1>
        <p className="text-xs text-muted-foreground">
          Retrouvez les actions que vous suivez en un clin d'oeil.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Portefeuille d'actions
              </div>
              <p className="text-sm text-muted-foreground">
                Organise tes actions par themes (US Tech, Actions FR, etc.)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Ex: US Technologie"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="w-56"
              />
              <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
                Creer
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {watchlists.map((list) => {
              const count = watchlistCounts[list.id] ?? 0;
              const active = list.id === activeWatchlistId;
              const Icon = getIconFor(list.id, list.isDefault);
              const colorKey = resolveColorKey(list);
              const colorClass = colorOptions[colorKey]?.chip ?? 'bg-amber-500';
              const coverClass = colorOptions[colorKey]?.cover ?? 'from-amber-500/30 via-yellow-400/10 to-transparent';
              const coverImage = list.coverImage ?? null;
              return (
                <div
                  key={list.id}
                  className={`rounded-lg border p-4 transition ${
                    active ? 'border-primary/60 bg-primary/5' : 'hover:border-muted-foreground/40'
                  }`}
                >
                  <div
                    className={`mb-4 h-12 w-full rounded-md ${
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3 text-left">
                      <div
                        className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center text-white`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        {editingId === list.id ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="h-8"
                          />
                        ) : (
                          <div className="truncate text-base font-semibold">
                            {list.name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {count} actions
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" asChild>
                        <Link href={`/favorites/${list.id}`}>Voir</Link>
                      </Button>
                      {editingId === list.id ? (
                        <>
                          <Button size="sm" onClick={() => handleSaveEdit(list)}>
                            <Check className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(list)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Renommer
                          </Button>
                          {!list.isDefault && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteWatchlist(list)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Choisissez une watchlist puis cliquez sur "Voir" pour ouvrir la page dediee.
        </div>
      </div>
    </div>
  );
}
