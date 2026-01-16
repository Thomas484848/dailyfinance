'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatNumber } from '@/lib/utils';

type Point = {
  price: number;
  timestamp: string;
};

type StockChartProps = {
  points: Point[];
};

type RangeOption = {
  label: string;
  days: number;
};

const RANGES: RangeOption[] = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '1Y', days: 365 },
  { label: 'MAX', days: 36500 },
];

function buildPath(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  return Number(value) || 0;
}

function formatDateLabel(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const date = new Date(parsed);
  return date.toLocaleDateString('fr-FR', {
    month: 'short',
    day: '2-digit',
  });
}

function formatDateTimeLabel(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const date = new Date(parsed);
  return date.toLocaleString('fr-FR', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StockChart({ points }: StockChartProps) {
  const [rangeIndex, setRangeIndex] = useState(2);
  const [autoRange, setAutoRange] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const sorted = useMemo(() => {
    return [...points].sort(
      (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );
  }, [points]);

  const rangeCounts = useMemo(() => {
    if (!sorted.length) return [];
    const latest = parseTimestamp(sorted[sorted.length - 1].timestamp);
    return RANGES.map((range) => {
      const cutoff = latest - range.days * 24 * 60 * 60 * 1000;
      return sorted.filter((point) => parseTimestamp(point.timestamp) >= cutoff).length;
    });
  }, [sorted]);

  const filtered = useMemo(() => {
    if (!sorted.length) return [];
    const latest = parseTimestamp(sorted[sorted.length - 1].timestamp);
    const range = RANGES[rangeIndex];
    const cutoff = latest - range.days * 24 * 60 * 60 * 1000;
    const slice = sorted.filter((point) => parseTimestamp(point.timestamp) >= cutoff);
    return slice.length >= 2 ? slice : sorted.slice(-Math.min(60, sorted.length));
  }, [sorted, rangeIndex]);

  useEffect(() => {
    if (!rangeCounts.length) return;
    if (rangeCounts[rangeIndex] >= 2) {
      setAutoRange(false);
      return;
    }
    const nextIndex = rangeCounts.findIndex((count) => count >= 2);
    if (nextIndex !== -1 && nextIndex !== rangeIndex) {
      setRangeIndex(nextIndex);
      setAutoRange(true);
    }
  }, [rangeCounts, rangeIndex]);

  if (!filtered || filtered.length < 2) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Pas assez de donnees pour afficher un graphique.
      </div>
    );
  }

  const series = filtered.filter((point) => point.price !== null);
  const values = series.map((point) => point.price as number);
  if (values.length < 2) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Pas assez de donnees pour afficher un graphique.
      </div>
    );
  }

  const width = 680;
  const height = 220;
  const path = buildPath(values, width, height);
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const start = values[0];
  const end = values[values.length - 1];
  const isUp = end >= start;
  const high = Math.max(...values);
  const low = Math.min(...values);
  const highIndex = values.indexOf(high);
  const lowIndex = values.indexOf(low);

  const displayIndex = hoverIndex ?? values.length - 1;
  const displayPoint = series[displayIndex];
  const displayValue = values[displayIndex];
  const xRatio = values.length > 1 ? displayIndex / (values.length - 1) : 0;
  const markerX = xRatio * width;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const markerY =
    height - ((displayValue - minValue) / (maxValue - minValue || 1)) * height;

  const percentChange = start ? (((end - start) / start) * 100).toFixed(2) : '0.00';

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const nextIndex = Math.round((x / width) * (values.length - 1));
    const clamped = Math.min(values.length - 1, Math.max(0, nextIndex));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setHoverIndex(clamped));
  };

  return (
    <div className="rounded-lg border bg-card p-6 relative overflow-hidden animate-in fade-in duration-700">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute left-10 top-24 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Cours</div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-semibold">{formatNumber(displayValue)}</div>
            <div
              className={`text-sm font-medium ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {isUp ? '+' : ''}
              {percentChange}%
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {displayPoint ? formatDateTimeLabel(displayPoint.timestamp) : '---'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Haut</span>
            <span className="font-medium">{formatNumber(high)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Bas</span>
            <span className="font-medium">{formatNumber(low)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {RANGES.map((range, index) => {
            const disabled = rangeCounts[index] !== undefined && rangeCounts[index] < 2;
            return (
              <button
                key={range.label}
                disabled={disabled}
                className={`rounded-full border px-3 py-1 text-xs ${
                  index === rangeIndex
                    ? 'border-transparent bg-foreground text-background'
                    : disabled
                    ? 'text-muted-foreground/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setRangeIndex(index)}
              >
                {range.label}
              </button>
            );
          })}
          {autoRange && (
            <span className="text-xs text-muted-foreground">
              Auto: {RANGES[rangeIndex]?.label}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="mt-4 h-56 w-full"
          role="img"
          aria-label="Graphique du cours"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.02" />
            </linearGradient>
            <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
              stroke="currentColor"
              strokeOpacity="0.06"
            />
          ))}

          <path d={areaPath} fill="url(#lineFill)" />
          <path
            d={path}
            fill="none"
            stroke={isUp ? '#10b981' : '#f43f5e'}
            strokeWidth="2.5"
            filter="url(#lineGlow)"
          />
          {hoverIndex !== null && (
            <line
              x1={markerX}
              x2={markerX}
              y1={0}
              y2={height}
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeDasharray="3 4"
            />
          )}
          <circle
            cx={markerX}
            cy={markerY}
            r="4"
            fill={isUp ? '#10b981' : '#f43f5e'}
            stroke="#111827"
            strokeWidth="1.5"
          />
          <circle
            cx={(highIndex / (values.length - 1 || 1)) * width}
            cy={height - ((high - minValue) / (maxValue - minValue || 1)) * height}
            r="3"
            fill="#111827"
            stroke="#10b981"
            strokeWidth="1.5"
          />
          <circle
            cx={(lowIndex / (values.length - 1 || 1)) * width}
            cy={height - ((low - minValue) / (maxValue - minValue || 1)) * height}
            r="3"
            fill="#111827"
            stroke="#f43f5e"
            strokeWidth="1.5"
          />
        </svg>

        {hoverIndex !== null && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-background/90 px-3 py-2 text-xs shadow">
            <div className="text-muted-foreground">
              {displayPoint ? formatDateTimeLabel(displayPoint.timestamp) : '---'}
            </div>
            <div className="text-sm font-semibold">{formatNumber(displayValue)}</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatDateLabel(filtered[0].timestamp)}</span>
        <span>{formatDateLabel(filtered[filtered.length - 1].timestamp)}</span>
      </div>
    </div>
  );
}
