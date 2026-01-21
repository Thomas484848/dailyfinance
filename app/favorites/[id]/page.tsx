import { Suspense } from 'react';
import WatchlistDetailClient from './watchlist-detail-client';

export const dynamic = 'force-dynamic';

export default function WatchlistPage() {
  return (
    <Suspense fallback={null}>
      <WatchlistDetailClient />
    </Suspense>
  );
}
