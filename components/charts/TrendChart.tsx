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

/**
 * Trend line chart.
 *
 * Dark-theme styled, brand-consistent. Supports multiple series
 * (e.g. one per pen) by passing an array of series.
 *
 * Y-axis auto-scales to the actual data range with smart padding,
 * so narrow metrics like body temperature (38-40°C) remain readable
 * instead of being flattened against a 0-based axis.
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

const DEFAULT_COLORS = ['#E85D26', '#C42368', '#D4A04A', '#5AC8FA', '#34C759'];

/**
 * Compute a readable Y-axis domain from the actual data.
 *
 * For temperatures (°C), we don't pin the floor at 0 — that would
 * flatten the 38-40°C body-temp range against an invisible axis.
 * For counts/amounts (g, h, activity), we keep the floor at 0.
 */
function computeYDomain(
  values: number[],
  unit?: string,
): [number, number] {
  if (values.length === 0) return [0, 10];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  // pad by 15% of range, with a floor of 0.3 units so flat series still render
  const padding = Math.max(range * 0.15, 0.3);

  // Temperatures: allow floor below 0-ish so 38°C isn't squashed
  // Other metrics (grams, hours, counts, THI): keep floor at 0
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
  // Normalise to a single array keyed by date for recharts
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

  // Gather all non-null values across all series to compute a smart Y domain
  const allValues = series
    .flatMap((s) => s.data.map((d) => d.value))
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const [yMin, yMax] = computeYDomain(allValues, unit);

  return (
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
        {series.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
