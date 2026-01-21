"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface WatchlistButtonProps {
  stockId: number;
}

export function WatchlistButton({ stockId }: WatchlistButtonProps) {
  const { toast } = useToast();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [itemsByWatchlist, setItemsByWatchlist] = useState<Record<number, WatchlistItem[]>>({});

  useEffect(() => {
    const load = async () => {
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
        const itemsEntries = await Promise.all(
          sorted.map(async (list) => {
            const itemsRes = await apiFetch(`/api/watchlists/${list.id}/items`);
            if (!itemsRes.ok) return [list.id, []] as const;
            const data = await itemsRes.json();
            const items = (data.items ?? []) as Array<{
              id: number;
              stock: { id: number } | null;
            }>;
            return [
              list.id,
              items
                .filter((item) => item.stock && typeof item.stock.id === 'number')
                .map((item) => ({ id: item.id, stockId: item.stock!.id })),
            ] as const;
          })
        );
        setItemsByWatchlist(Object.fromEntries(itemsEntries));
      } catch {
        // ignore
      }
    };
    load();
  }, [stockId]);

  const handleToggle = async (list: Watchlist) => {
    const existingItem =
      itemsByWatchlist[list.id]?.find((item) => item.stockId === stockId) ?? null;
    try {
      const res = await apiFetch(
        existingItem
          ? `/api/watchlists/${list.id}/items/${existingItem.id}`
          : `/api/watchlists/${list.id}/items`,
        {
          method: existingItem ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: existingItem ? undefined : JSON.stringify({ stockId }),
        }
      );
      if (!res.ok) throw new Error('Mise a jour impossible');
      const nextItemId = !existingItem ? (await res.json()).id : null;
      setWatchlists((prev) =>
        prev.map((watchlist) => {
          if (watchlist.id !== list.id) return watchlist;
          return {
            ...watchlist,
          };
        })
      );
      setItemsByWatchlist((prev) => {
        const current = prev[list.id] ?? [];
        return {
          ...prev,
          [list.id]: existingItem
            ? current.filter((item) => item.id !== existingItem.id)
            : [...current, { id: nextItemId ?? Date.now(), stockId }],
        };
      });
      toast({
        title: existingItem ? 'Retire de la watchlist' : 'Ajoute a la watchlist',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  const totalIn = watchlists.filter((list) =>
    itemsByWatchlist[list.id]?.some((item) => item.stockId === stockId)
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={totalIn > 0 ? 'default' : 'outline'}>
          <Star className={`h-4 w-4 mr-2 ${totalIn > 0 ? 'fill-current' : ''}`} />
          {totalIn > 0 ? `Dans ${totalIn} watchlist` : 'Ajouter a une watchlist'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Choisir une watchlist</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {watchlists.length === 0 ? (
          <DropdownMenuItem disabled>Aucune watchlist</DropdownMenuItem>
        ) : (
          watchlists.map((list) => {
            const active = itemsByWatchlist[list.id]?.some((item) => item.stockId === stockId);
            return (
              <DropdownMenuItem key={list.id} onClick={() => handleToggle(list)}>
                <span className="flex flex-1 items-center gap-2">
                  {active ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  {list.name}
                </span>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
