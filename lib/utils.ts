import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null, currency = 'USD'): string {
  if (value === null) return 'N/A';
  const safeCurrency =
    typeof currency === 'string' && currency.trim().length >= 3 ? currency : 'USD';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMarketCap(value: number | null): string {
  if (value === null) return 'N/A';

  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  return formatNumber(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function cleanDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  let cleaned = name.trim();
  const patterns = [
    /\s+-\s+CLASS\s+[A-Z].*$/i,
    /\s+-\s+UNITS?$/i,
    /\s+-\s+WARRANTS?$/i,
    /\s+COMMON\s+STOCK$/i,
    /\s+ORDINARY\s+SHARES?$/i,
    /\s+CLASS\s+[A-Z]$/i,
    /\s+CORPORATION$/i,
    /\s+CORP\.?$/i,
    /\s+INC\.?$/i,
    /\s+INCORPORATED$/i,
    /\s+LTD\.?$/i,
    /\s+LIMITED$/i,
    /\s+PLC\.?$/i,
  ];

  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned.length > 1 ? cleaned : name.trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

