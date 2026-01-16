'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search-bar';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <TrendingUp className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight">Daily Finance</span>
        </Link>

        <div className="flex-1 max-w-2xl mx-8 hidden md:block">
          <SearchBar />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  );
}

