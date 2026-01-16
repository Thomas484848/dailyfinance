'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WatchlistButtonProps {
  stockId: string;
}

export function WatchlistButton({ stockId }: WatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Genere ou recupere un userKey unique (stocke en localStorage)
  const getUserKey = () => {
    let userKey = localStorage.getItem('dailyfinance_user_key');
    if (!userKey) {
      userKey = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('dailyfinance_user_key', userKey);
    }
    return userKey;
  };

  // Verifie si l'action est dans la watchlist (localStorage pour l'instant)
  useEffect(() => {
    const watchlist = JSON.parse(localStorage.getItem('dailyfinance_watchlist') || '[]');
    setIsInWatchlist(watchlist.includes(stockId));
  }, [stockId]);

  const toggleWatchlist = async () => {
    setIsLoading(true);
    try {
      const userKey = getUserKey();
      const response = await fetch('/api/watchlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, stockId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise a jour de la watchlist');
      }

      const data = await response.json();

      // Mettre a jour le localStorage
      let watchlist = JSON.parse(localStorage.getItem('dailyfinance_watchlist') || '[]');
      if (data.added) {
        watchlist.push(stockId);
      } else {
        watchlist = watchlist.filter((id: string) => id !== stockId);
      }
      localStorage.setItem('dailyfinance_watchlist', JSON.stringify(watchlist));

      setIsInWatchlist(data.added);
      toast({
        title: data.added ? 'Ajoute a la watchlist' : 'Retire de la watchlist',
        description: data.message,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre a jour la watchlist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isInWatchlist ? 'default' : 'outline'}
      onClick={toggleWatchlist}
      disabled={isLoading}
    >
      <Star className={`h-4 w-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
      {isInWatchlist ? 'Dans la watchlist' : 'Ajouter a la watchlist'}
    </Button>
  );
}

