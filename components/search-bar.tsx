'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Suspense } from 'react';

function SearchBarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('query') || '');

  const debouncedSearch = useDebouncedCallback((searchValue: string) => {
    const params = new URLSearchParams(searchParams);
    if (searchValue) {
      params.set('query', searchValue);
    } else {
      params.delete('query');
    }
    params.delete('page'); // Reset to page 1
    router.push(`/?${params.toString()}`);
  }, 300);

  useEffect(() => {
    const query = searchParams.get('query') || '';
    setValue(query);
  }, [searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Rechercher une action (nom, ticker, ISIN)..."
        className="pl-10"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          debouncedSearch(e.target.value);
        }}
      />
    </div>
  );
}

export function SearchBar() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchBarContent />
    </Suspense>
  );
}

