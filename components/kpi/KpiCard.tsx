import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/card';

/**
 * KPI Card.
 *
 * Used in the Executive Overview. Large numeric value, label in Barlow
 * Condensed per brand, optional delta indicator, optional icon.
 *
 * `tone` drives the accent line color:
 *   - neutral: brand gradient (default)
 *   - positive: success green
 *   - warning: warning yellow
 *   - critical: critical red
 */

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  tone?: 'neutral' | 'positive' | 'warning' | 'critical';
  icon?: ReactNode;
  hint?: string;
}

const toneMap = {
  neutral: 'before:bg-brand-gradient',
  positive: 'before:bg-status-success',
  warning: 'before:bg-status-warning',
  critical: 'before:bg-status-critical',
} as const;

export function KpiCard({
  label,
  value,
  unit,
  delta,
  tone = 'neutral',
  icon,
  hint,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5',
        'before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px]',
        toneMap[tone],
      )}
    >
      <div className="flex items-start justify-between">
        <p className="label-badge">{label}</p>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[42px] leading-none tracking-tight text-ink-primary">
          {value}
        </span>
        {unit && <span className="text-sm text-ink-secondary">{unit}</span>}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              'font-semibold',
              delta.direction === 'up' && 'text-status-success',
              delta.direction === 'down' && 'text-status-critical',
              delta.direction === 'flat' && 'text-ink-muted',
            )}
          >
            {delta.direction === 'up' && '▲ '}
            {delta.direction === 'down' && '▼ '}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-ink-muted">{hint}</span>}
      </div>
    </Card>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
