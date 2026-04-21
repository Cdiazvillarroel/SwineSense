'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Trend line chart.
 *
 * Features:
 *  - Multiple series (one per pen), each with a distinct color.
 *  - Smart Y-axis: auto-scales to actual data range. For °C metrics
 *    the floor is not pinned to 0 so narrow ranges stay readable.
 *  - Interactive legend: click a pen chip to focus that series; the
 *    others fade to 12% opacity. Click the same chip (or "Show all")
 *    to restore the full view.
 */
export interface TrendSeries {
  name: string;
  color?: string;
  data: { date: string; value: number | null }[];
}

interface TrendChartProps {
  series: TrendSeries[];
  unit?: string;
  height?: number;
}

const DEFAULT_COLORS = [
  '#E85D26', // brand orange
  '#C42368', // brand magenta
  '#D4A04A', // amber
  '#5AC8FA', // cyan
  '#34C759', // green
  '#A78BFA', // violet
  '#F472B6', // pink
  '#FB923C', // orange-300
];

function computeYDomain(values: number[], unit?: string): [number, number] {
  if (values.length === 0) return [0, 10];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = Math.max(range * 0.15, 0.3);
  const allowSubZero = unit === '°C';
  const rawMin = min - padding;
  const rawMax = max + padding;
  const lo = allowSubZero
    ? Math.floor(rawMin * 10) / 10
    : Math.max(0, Math.floor(rawMin * 10) / 10);
  const hi = Math.ceil(rawMax * 10) / 10;
  return [lo, hi];
}

export function TrendChart({ series, unit, height = 280 }: TrendChartProps) {
  const [focused, setFocused] = useState<string | null>(null);

  const dates = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.date))),
  ).sort();

  const merged = dates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    series.forEach((s) => {
      const point = s.data.find((d) => d.date === date);
      row[s.name] = point?.value ?? null;
    });
    return row;
  });

  const allValues = series
    .flatMap((s) => s.data.map((d) => d.value))
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const [yMin, yMax] = computeYDomain(allValues, unit);

  return (
    <div className="space-y-3">
      {/* Interactive legend — click to focus one series, click again to clear */}
      {series.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {series.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const isActive = focused === s.name;
            const isDimmed = focused !== null && !isActive;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() =>
                  setFocused((prev) => (prev === s.name ? null : s.name))
                }
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                  isActive
                    ? 'border-brand-orange bg-brand-orange/10 text-ink-primary'
                    : 'border-surface-border text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary',
                  isDimmed && 'opacity-40',
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                {s.name}
              </button>
            );
          })}
          {focused && (
            <button
              type="button"
              onClick={() => setFocused(null)}
              className="rounded-full px-2.5 py-1 text-xs text-ink-muted hover:text-ink-primary"
            >
              Show all
            </button>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={merged} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2C323C" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9E978C', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2C323C' }}
            tickFormatter={(v: string) => format(parseISO(v), 'd MMM')}
          />
          <YAxis
            tick={{ fill: '#9E978C', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2C323C' }}
            unit={unit}
            width={50}
            domain={[yMin, yMax]}
            allowDecimals={true}
          />
          <Tooltip
            contentStyle={{
              background: '#13161C',
              border: '1px solid #2C323C',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#EAE6DE', fontWeight: 700 }}
            itemStyle={{ color: '#EAE6DE' }}
            labelFormatter={(v: string) => format(parseISO(v), 'd MMM yyyy')}
          />
          {series.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const isActive = focused === s.name;
            const isDimmed = focused !== null && !isActive;
            return (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={color}
                strokeWidth={isActive ? 3 : 2}
                strokeOpacity={isDimmed ? 0.12 : 1}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
