import { Suspense } from 'react';
import FavoritesClient from './FavoritesClient';

export const dynamic = 'force-dynamic';

export default function FavoritesPage() {
  return (
    <Suspense fallback={null}>
      <FavoritesClient />
    </Suspense>
  );
}
