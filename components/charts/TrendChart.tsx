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
