'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const COUNTRIES = [
  { value: 'USA', label: 'Etats-Unis' },
  { value: 'France', label: 'France' },
  { value: 'Germany', label: 'Allemagne' },
  { value: 'UK', label: 'Royaume-Uni' },
  { value: 'Japan', label: 'Japon' },
  { value: 'China', label: 'Chine' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Switzerland', label: 'Suisse' },
  { value: 'Spain', label: 'Espagne' },
  { value: 'Italy', label: 'Italie' },
  { value: 'Australia', label: 'Australie' },
];

const EXCHANGES = [
  { value: 'US', label: 'USA (NASDAQ/NYSE)' },
  { value: 'F', label: 'Frankfurt (DAX)' },
  { value: 'LSE', label: 'London (FTSE)' },
  { value: 'PA', label: 'Paris (CAC 40)' },
  { value: 'T', label: 'Tokyo (Nikkei)' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'TO', label: 'Toronto' },
  { value: 'SW', label: 'Suisse (SMI)' },
  { value: 'MI', label: 'Milan' },
  { value: 'AU', label: 'Australie' },
];

const STATUSES = [
  { value: 'UNDER', label: 'Sous-evalue' },
  { value: 'FAIR', label: 'Neutre' },
  { value: 'OVER', label: 'Sur-evalue' },
  { value: 'NA', label: 'N/A' },
];

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1
    router.push(`/?${params.toString()}`);
  };

  const currentCountry = searchParams.get('country');
  const currentExchange = searchParams.get('exchange');
  const currentStatus = searchParams.get('status');
  const activeCount = [currentCountry, currentExchange, currentStatus].filter(Boolean)
    .length;

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('country');
    params.delete('exchange');
    params.delete('status');
    params.delete('page');
    const query = params.toString();
    router.push(query ? `/?${query}` : '/');
  };

  return (
    <div className="mb-6 sticky top-16 z-40">
      <div className="rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
      <Select
        value={currentCountry || 'all'}
        onValueChange={(value: string) => updateFilter('country', value)}
      >
        <SelectTrigger className="w-full sm:w-[200px] bg-background/80">
          <SelectValue placeholder="Tous les pays" />
        </SelectTrigger>
        <SelectContent className="z-[80] bg-background/95 backdrop-blur border shadow-xl ring-1 ring-border">
          <SelectItem value="all">Tous les pays</SelectItem>
          {COUNTRIES.map((country) => (
            <SelectItem key={country.value} value={country.value}>
              {country.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentExchange || 'all'}
        onValueChange={(value: string) => updateFilter('exchange', value)}
      >
        <SelectTrigger className="w-full sm:w-[200px] bg-background/80">
          <SelectValue placeholder="Toutes les bourses" />
        </SelectTrigger>
        <SelectContent className="z-[80] bg-background/95 backdrop-blur border shadow-xl ring-1 ring-border">
          <SelectItem value="all">Toutes les bourses</SelectItem>
          {EXCHANGES.map((exchange) => (
            <SelectItem key={exchange.value} value={exchange.value}>
              {exchange.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentStatus || 'all'}
        onValueChange={(value: string) => updateFilter('status', value)}
      >
        <SelectTrigger className="w-full sm:w-[200px] bg-background/80">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent className="z-[80] bg-background/95 backdrop-blur border shadow-xl ring-1 ring-border">
          <SelectItem value="all">Tous les statuts</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              Filtres actifs
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                {activeCount}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={activeCount === 0}
            >
              Réinitialiser filtres
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

