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
  const { toast } = useToast();

  // Verifie si l'action est dans la watchlist (localStorage pour l'instant)
  useEffect(() => {
    const watchlist = JSON.parse(localStorage.getItem('dailyfinance_watchlist') || '[]');
    setIsInWatchlist(watchlist.includes(stockId));
  }, [stockId]);

  const toggleWatchlist = () => {
    try {
      let watchlist = JSON.parse(localStorage.getItem('dailyfinance_watchlist') || '[]');
      const added = !watchlist.includes(stockId);
      if (added) {
        watchlist.push(stockId);
      } else {
        watchlist = watchlist.filter((id: string) => id !== stockId);
      }
      localStorage.setItem('dailyfinance_watchlist', JSON.stringify(watchlist));

      setIsInWatchlist(added);
      toast({
        title: added ? 'Ajoute a la watchlist' : 'Retire de la watchlist',
        description: added
          ? 'Ajoute en local (non synchronise).'
          : 'Retire en local (non synchronise).',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre a jour la watchlist',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={isInWatchlist ? 'default' : 'outline'}
      onClick={toggleWatchlist}
    >
      <Star className={`h-4 w-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
      {isInWatchlist ? 'Dans la watchlist' : 'Ajouter a la watchlist'}
    </Button>
  );
}

