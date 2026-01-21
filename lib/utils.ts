import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanDisplayName(value: string | null | undefined) {
  if (!value) return '—';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || '—';
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${formatted}%`;
}

export function formatCurrency(value: number | null | undefined, currency = 'USD') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function formatMarketCap(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const formatWithUnit = (divisor: number, unit: string) => {
    const scaled = value / divisor;
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${formatNumber(scaled, digits)} ${unit}`;
  };

  if (abs >= 1_000_000_000_000) return formatWithUnit(1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return formatWithUnit(1_000_000_000, 'B');
  if (abs >= 1_000_000) return formatWithUnit(1_000_000, 'M');
  if (abs >= 1_000) return formatWithUnit(1_000, 'K');
  return formatNumber(value, 2);
}
