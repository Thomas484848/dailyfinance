'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { WatchlistButton } from '@/components/watchlist-button';
import {
  cleanDisplayName,
  formatCurrency,
  formatMarketCap,
  formatNumber,
  formatPercent,
} from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StockChart } from '@/components/stock-chart';
import Link from 'next/link';
import { LogoImage } from '@/components/logo-image';
import { apiFetch } from '@/lib/api-client';

export default function StockPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbol = params.symbol as string;
  const exchange = searchParams.get('exchange');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStock() {
      try {
        const query = exchange ? `?exchange=${encodeURIComponent(exchange)}` : '';
        const res = await apiFetch(`/api/stocks/${symbol}${query}`);

        if (!res.ok) {
          throw new Error('Action non trouvee');
        }

        const stockData = await res.json();
        setData(stockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStock();
  }, [symbol, exchange]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Action non trouvee</h2>
        <p className="text-muted-foreground">{error || 'Cette action n\'existe pas'}</p>
      </div>
    );
  }

  const { stock, quote, valuation } = data;
  const displayName = cleanDisplayName(stock.name);
  const descriptionParts = [
    stock.country ? `du pays ${stock.country}` : null,
    stock.sector ? `du secteur ${stock.sector}` : null,
    stock.industry ? `de l'industrie ${stock.industry}` : null,
    stock.exchange ? `cotee sur ${stock.exchange}` : null,
  ].filter(Boolean);
  const fallbackDescription = descriptionParts.length
    ? `${displayName} est une entreprise ${descriptionParts.join(', ')}.`
    : `${displayName} est une entreprise cotee en bourse.`;
  const description = fallbackDescription;
  const logoUrl = stock.logoUrl || null;
  const logoLabel = displayName || stock.symbol;

  const staggerClasses =
    'animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out fill-mode-both';

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out fill-mode-both" style={{ animationDelay: '0ms' }}>
        <div className="flex items-start gap-4">
          <LogoImage
            src={logoUrl}
            name={logoLabel}
            symbol={stock.symbol}
            size={56}
            loading="eager"
            className="text-sm"
          />
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{displayName}</h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="font-mono text-lg">{stock.symbol}</span>
              {stock.exchange && (
                <>
                  <span></span>
                  <span>{stock.exchange}</span>
                </>
              )}
              {stock.country && (
                <>
                  <span></span>
                  <span>{stock.country}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <WatchlistButton stockId={stock.id} />
      </div>

      {/* Chart */}
      <div className={staggerClasses} style={{ animationDelay: '140ms' }}>
        <StockChart points={data.history || []} />
      </div>

      {/* Price Card */}
      <Card className={staggerClasses} style={{ animationDelay: '280ms' }}>
        <CardHeader>
          <CardTitle>Prix</CardTitle>
        </CardHeader>
        <CardContent>
          {quote ? (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">
                  {formatCurrency(quote.price, stock.currency)}
                </span>
                {quote.change !== null && (
                  <div
                    className={`flex items-center gap-1 text-lg ${
                      quote.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {quote.change >= 0 ? (
                      <ArrowUp className="h-5 w-5" />
                    ) : (
                      <ArrowDown className="h-5 w-5" />
                    )}
                    <span>{formatCurrency(Math.abs(quote.change), stock.currency)}</span>
                    <span>({formatPercent(quote.changePercent)})</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Derniere mise a jour: {new Date(quote.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Prix non disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Valuation Card */}
      <Card className={staggerClasses} style={{ animationDelay: '420ms' }}>
        <CardHeader>
          <CardTitle>Valorisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">PER Actuel</div>
              <div className="text-2xl font-bold">{formatNumber(valuation.peCurrent)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">PER Moyen</div>
              <div className="text-2xl font-bold">{formatNumber(valuation.peAvg)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Statut</div>
              <div>
                <StatusBadge status={valuation.status} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card className={staggerClasses} style={{ animationDelay: '560ms' }}>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stock.isin && (
              <div>
                <div className="text-sm text-muted-foreground">ISIN</div>
                <div className="font-medium">{stock.isin}</div>
              </div>
            )}
            {stock.sector && (
              <div>
                <div className="text-sm text-muted-foreground">Secteur</div>
                <div className="font-medium">{stock.sector}</div>
              </div>
            )}
            {stock.industry && (
              <div>
                <div className="text-sm text-muted-foreground">Industrie</div>
                <div className="font-medium">{stock.industry}</div>
              </div>
            )}
            {stock.country && (
              <div>
                <div className="text-sm text-muted-foreground">Pays</div>
                <div className="font-medium">{stock.country}</div>
              </div>
            )}
            {stock.exchange && (
              <div>
                <div className="text-sm text-muted-foreground">Bourse</div>
                <div className="font-medium">{stock.exchange}</div>
              </div>
            )}
            {stock.marketCap && (
              <div>
                <div className="text-sm text-muted-foreground">Capitalisation</div>
                <div className="font-medium animate-in zoom-in duration-500 ease-out">{formatMarketCap(stock.marketCap)}</div>
              </div>
            )}
            {stock.currency && (
              <div>
                <div className="text-sm text-muted-foreground">Devise</div>
                <div className="font-medium">{stock.currency}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className={staggerClasses} style={{ animationDelay: '700ms' }}>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>

    </div>
  );
}

