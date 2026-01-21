'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, Moon, Star, Sun, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchBar } from '@/components/search-bar';
import { apiFetch } from '@/lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [hasToken, setHasToken] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const updateToken = () => {
      setHasToken(Boolean(window.localStorage.getItem('jwt_token')));
      setUserEmail(window.localStorage.getItem('user_email'));
    };
    updateToken();
    window.addEventListener('storage', updateToken);
    return () => window.removeEventListener('storage', updateToken);
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await apiFetch('/user');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAvatarUrl(data.avatarUrl ?? null);
        if (data.email) {
          setUserEmail(data.email);
        }
      } catch {
        // Ignore profile load errors in header.
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const initials = (userEmail ?? 'User')
    .split('@')[0]
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center gap-4 px-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6" />
            <span className="text-xl font-semibold tracking-tight font-display">
              Daily Finance
            </span>
          </Link>
        </div>
        <div className="hidden flex-1 items-center justify-center px-2 md:flex">
          <div className="w-full max-w-md">
            <SearchBar />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {hasToken && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase"
                  aria-label="Compte"
                >
                  <Avatar className="h-8 w-8">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Photo de profil" />}
                    <AvatarFallback className="bg-black text-white">
                      {initials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-border bg-background/95 shadow-lg backdrop-blur"
              >
                <DropdownMenuLabel>Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    window.localStorage.removeItem('jwt_token');
                    window.localStorage.removeItem('user_email');
                    window.location.reload();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Se deconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

