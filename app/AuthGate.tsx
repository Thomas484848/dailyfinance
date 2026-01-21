"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const PUBLIC_PATHS = new Set(['/login', '/register']);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  const isPublicRoute = useMemo(() => {
    if (!pathname) return false;
    return PUBLIC_PATHS.has(pathname);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      setToken(window.localStorage.getItem('jwt_token'));
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (token === undefined) return;
    if (!token && !isPublicRoute) {
      router.replace('/login');
      return;
    }
    if (token && isPublicRoute) {
      router.replace('/');
    }
  }, [isPublicRoute, router, token]);

  if (token === undefined) return null;
  if (!token && !isPublicRoute) return null;
  if (token && isPublicRoute) return null;

  return <>{children}</>;
}
