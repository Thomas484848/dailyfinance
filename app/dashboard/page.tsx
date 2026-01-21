import { Suspense } from 'react';
import HomeClient from '../HomeClient';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
