'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Settings,
  Thermometer,
  Wheat,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/format';
import {
  RISK_CATEGORY_DESCRIPTIONS,
  RISK_CATEGORY_LABELS,
  DRIVER_LABELS,
  type FarmRiskScore,
  type RiskCategory,
  type RiskCategoryBreakdown,
  type RiskDriver,
} from '@/lib/types/risk';
import type { RiskLevel } from '@/lib/types/domain';

/**
 * Risk Breakdown — replaces the single "Health risk" chart on the Overview.
 *
 * Layout:
 *   1. Composite "Farm Risk Score" header (overall + status badge)
 *   2. 4 interactive cards (one per category) showing score + drivers
 *   3. A shared chart that swaps to the trend of whatever card is selected
 *
 * Selecting a category is purely client-side (useState); the 4 series are
 * pre-fetched on the server so switching is instant.
 *
 * NOTE: Imports types from `@/lib/types/risk` (NOT from `@/lib/db/kpi`)
 * because this is a Client Component and lib/db/kpi has `server-only`.
 */

const CATEGORY_COLORS: Record<RiskCategory, { hex: string; rgb: string }> = {
  health:      { hex: '#E85D26', rgb: '232, 93, 38'  },
  environment: { hex: '#C42368', rgb: '196, 35, 104' },
  feed:        { hex: '#D4A04A', rgb: '212, 160, 74' },
  operational: { hex: '#5AC8FA', rgb: '90, 200, 250' },
};

const CATEGORY_ICONS: Record<RiskCategory, typeof Activity> = {
  health: Activity,
  environment: Thermometer,
  feed: Wheat,
  operational: Settings,
};

/**
 * Inline status badge — uses Tailwind classes directly so we don't depend on
 * the shared Badge component supporting our exact variant names.
 */
function StatusBadge({ status }: { status: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    Severe:   'bg-status-critical/15 text-status-critical border-status-critical/40',
    High:     'bg-brand-orange-light/15 text-brand-orange-light border-brand-orange-light/40',
    Moderate: 'bg-status-warning/12 text-status-warning border-status-warning/35',
    Low:      'bg-status-success/12 text-status-success border-status-success/35',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-condensed text-[11px] font-bold uppercase tracking-label',
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Per-category card
// -----------------------------------------------------------------------------

function RiskCategoryCard({
  data,
  selected,
  onClick,
}: {
  data: RiskCategoryBreakdown;
  selected: boolean;
  onClick: () => void;
}) {
  const color = CATEGORY_COLORS[data.category];
  const Icon = CATEGORY_ICONS[data.category];
  const fillPct = Math.min(100, (data.score / 10) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full flex-col gap-3 rounded-card border bg-surface-card p-5 text-left',
        'transition-all duration-150',
        'hover:-translate-y-0.5',
        selected
          ? 'border-transparent shadow-glow-orange'
          : 'border-surface-border hover:border-ink-muted/40',
      )}
      style={{
        borderTop: `3px solid ${color.hex}`,
        ...(selected && { boxShadow: `0 8px 28px -10px rgba(${color.rgb}, 0.45)` }),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: color.hex }} />
          <span className="label-badge">{RISK_CATEGORY_LABELS[data.category]}</span>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Score */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-[36px] leading-none tracking-tight text-ink-primary">
            {formatNumber(data.score, 1)}
          </span>
          <span className="text-sm font-semibold text-ink-muted">/10</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${fillPct}%`,
              background: color.hex,
            }}
          />
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        {RISK_CATEGORY_DESCRIPTIONS[data.category]}
      </p>

      {/* Drivers */}
      <div className="mt-auto border-t border-surface-border pt-3">
        <p className="label-badge mb-2 text-[10px]">Drivers</p>
        {data.drivers.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-status-success">
            <Check className="h-3.5 w-3.5" />
            <span>No active issues</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.drivers.slice(0, 3).map((d) => (
              <DriverLine key={d.alertType} driver={d} />
            ))}
            {data.drivers.length > 3 && (
              <p className="text-[11px] italic text-ink-muted">
                +{data.drivers.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function DriverLine({ driver }: { driver: RiskDriver }) {
  const label = DRIVER_LABELS[driver.alertType] ?? driver.alertType.replace(/_/g, ' ');
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate text-ink-secondary">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono">
        {driver.critical > 0 && (
          <span className="font-semibold text-status-critical">
            {driver.critical}C
          </span>
        )}
        {driver.high > 0 && (
          <span className="font-semibold text-brand-orange-light">
            {driver.high}H
          </span>
        )}
        {driver.medium > 0 && (
          <span className="font-semibold text-status-warning">
            {driver.medium}M
          </span>
        )}
        {driver.low > 0 && (
          <span className="font-semibold text-ink-muted">
            {driver.low}L
          </span>
        )}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export interface RiskBreakdownProps {
  data: FarmRiskScore;
  seriesByCategory: Record<RiskCategory, { date: string; value: number | null }[]>;
}

export function RiskBreakdown({ data, seriesByCategory }: RiskBreakdownProps) {
  const [selected, setSelected] = useState<RiskCategory>('health');
  const color = CATEGORY_COLORS[selected];
  const Icon = CATEGORY_ICONS[selected];
  const selectedCategory = data.categories.find((c) => c.category === selected)!;

  const chartData = useMemo(() => {
    return seriesByCategory[selected].map((p) => ({
      date: p.date,
      value: p.value,
    }));
  }, [selected, seriesByCategory]);

  return (
    <Card className="card-accent-top relative overflow-hidden">
      {/* Composite header */}
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-badge text-brand-orange">Farm Risk Score</p>
            <div className="mt-1.5 flex items-baseline gap-3">
              <span className="font-display text-[44px] leading-none tracking-tight text-ink-primary">
                {formatNumber(data.overall, 1)}
              </span>
              <span className="text-base font-semibold text-ink-muted">/10</span>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-2 text-sm text-ink-secondary">
              Composite of health, environment, feed and operational risk.
            </p>
          </div>
          <p className="text-xs text-ink-muted">
            Click a category to see its 30-day trend
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 4 cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.categories.map((cat) => (
            <RiskCategoryCard
              key={cat.category}
              data={cat}
              selected={selected === cat.category}
              onClick={() => setSelected(cat.category)}
            />
          ))}
        </div>

        {/* Interactive chart */}
        <div className="rounded-card border border-surface-border bg-surface-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label-badge">30-day trend</p>
              <div className="mt-1 flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: color.hex }} />
                <h3 className="font-display text-lg text-ink-primary">
                  {RISK_CATEGORY_LABELS[selected]} Risk Index
                </h3>
                <span className="text-sm font-semibold" style={{ color: color.hex }}>
                  Current {formatNumber(selectedCategory.score, 1)}/10
                </span>
              </div>
            </div>
          </div>

          <div className="h-[260px] w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-ink-muted">
                  No data yet — KPIs populate as more days of telemetry are processed.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${selected}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color.hex} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={color.hex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    domain={[0, 10]}
                    width={32}
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
                    formatter={(v: number) => [`${formatNumber(v, 2)} / 10`, RISK_CATEGORY_LABELS[selected]]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color.hex}
                    strokeWidth={2}
                    fill={`url(#gradient-${selected})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
