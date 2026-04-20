'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AlertSeverity } from '@/lib/types/domain';

/**
 * Alert distribution donut.
 *
 * Shows open alerts grouped by severity. Center label shows total count.
 * Colors come directly from the functional palette in the Brand Manual.
 */

const COLOR_MAP: Record<AlertSeverity, string> = {
  Critical: '#FF453A',
  High: '#FFD60A',
  Medium: '#5AC8FA',
  Low: '#6B6760',
};

export interface AlertDistributionChartProps {
  counts: Record<AlertSeverity, number>;
  height?: number;
}

export function AlertDistributionChart({
  counts,
  height = 220,
}: AlertDistributionChartProps) {
  const data = (Object.keys(counts) as AlertSeverity[])
    .filter((sev) => counts[sev] > 0)
    .map((sev) => ({ name: sev, value: counts[sev], color: COLOR_MAP[sev] }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-card border border-surface-border bg-surface-card"
        style={{ height }}
      >
        <p className="text-sm text-ink-muted">No open alerts</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            stroke="#0C0E12"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#13161C',
              border: '1px solid #2C323C',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: '#EAE6DE' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center total */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl text-ink-primary">{total}</span>
        <span className="label-badge">Open alerts</span>
      </div>
    </div>
  );
}
