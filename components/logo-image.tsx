'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoImageProps = {
  src?: string | null;
  name: string;
  symbol: string;
  size?: number;
  loading?: 'eager' | 'lazy';
  className?: string;
};

function getInitials(name: string, symbol: string): string {
  const base = name?.trim() ? name : symbol;
  const initials = base
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || symbol.slice(0, 2).toUpperCase();
}

export function LogoImage({
  src,
  name,
  symbol,
  size = 32,
  loading = 'lazy',
  className,
}: LogoImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src) && !errored;
  const initials = getInitials(name, symbol);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full border bg-muted text-xs font-semibold',
        className
      )}
      style={{ width: size, height: size }}
      aria-label={symbol}
    >
      {showImage ? (
        <>
          <Image
            src={src ?? ''}
            alt={symbol}
            width={size}
            height={size}
            loading={loading}
            priority={loading === 'eager'}
            draggable={false}
            onLoadingComplete={() => setLoaded(true)}
            onError={() => setErrored(true)}
            sizes={`${size}px`}
            className={cn(
              'rounded-full object-contain mix-blend-multiply transition-opacity duration-300 dark:mix-blend-screen',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
          {!loaded && (
            <div className="absolute inset-0 rounded-full bg-muted animate-pulse" />
          )}
        </>
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
