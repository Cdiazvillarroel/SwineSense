'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { AnimalRow, AlertSeverity, HealthStatus } from '@/lib/db/animals';

const HEALTH_BADGE: Record<string, string> = {
  healthy: 'border-emerald-400/40 text-emerald-400',
  monitoring: 'border-amber-400/40 text-amber-400',
  sick: 'border-rose-400/40 text-rose-400',
  recovering: 'border-sky-400/40 text-sky-400',
  deceased: 'border-ink-muted/40 text-ink-muted',
};

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function tempStyle(t: number | null): string {
  if (t === null) return 'text-ink-muted';
  if (t > 39.5) return 'text-rose-400 font-semibold';
  if (t > 39.0) return 'text-amber-400';
  return 'text-ink-primary';
}

function activityStyle(a: number | null): string {
  if (a === null) return 'text-ink-muted';
  if (a < 50) return 'text-rose-400 font-semibold';
  if (a < 70) return 'text-amber-400';
  return 'text-ink-primary';
}

export function AnimalsTable({ rows }: { rows: AnimalRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const openDrawer = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('animal', id);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-ink-muted">
        No animals match the current filters.
      </p>
    );
  }

  return (
    <div className={'overflow-x-auto ' + (isPending ? 'opacity-60' : '')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-2 font-medium">Tag</th>
            <th className="px-4 py-2 font-medium">Site</th>
            <th className="px-4 py-2 font-medium">Pen</th>
            <th className="px-4 py-2 text-right font-medium">Last temp</th>
            <th className="px-4 py-2 text-right font-medium">Activity</th>
            <th className="px-4 py-2 font-medium">Last reading</th>
            <th className="px-4 py-2 font-medium">Health</th>
            <th className="px-4 py-2 font-medium">Alerts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => openDrawer(r.id)}
              className="cursor-pointer border-b border-surface-border transition-colors last:border-0 hover:bg-white/5"
            >
              <td className="px-4 py-2 font-mono text-ink-primary">
                {r.tag_number}
              </td>
              <td className="px-4 py-2 text-ink-secondary">
                {r.site_name ?? '—'}
              </td>
              <td className="px-4 py-2 text-ink-secondary">
                {r.pen_name ?? '—'}
                {r.pen_type && (
                  <span className="ml-1 text-[10px] uppercase tracking-wider text-ink-muted">
                    {r.pen_type}
                  </span>
                )}
              </td>
              <td
                className={
                  'px-4 py-2 text-right tabular-nums ' + tempStyle(r.last_temp)
                }
              >
                {r.last_temp !== null ? `${r.last_temp.toFixed(2)}°` : '—'}
              </td>
              <td
                className={
                  'px-4 py-2 text-right tabular-nums ' +
                  activityStyle(r.last_activity)
                }
              >
                {r.last_activity !== null ? r.last_activity.toFixed(0) : '—'}
              </td>
              <td className="px-4 py-2 text-ink-muted">
                {formatRelative(r.last_reading_at)}
              </td>
              <td className="px-4 py-2">
                <HealthPill status={r.health_status} />
              </td>
              <td className="px-4 py-2">
                {r.open_alert_count > 0 && r.highest_severity ? (
                  <span
                    className={
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ' +
                      SEVERITY_BADGE[r.highest_severity]
                    }
                  >
                    <span className="font-semibold tabular-nums">
                      {r.open_alert_count}
                    </span>
                    <span>{r.highest_severity}</span>
                  </span>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthPill({ status }: { status: HealthStatus | string | null }) {
  const cls = HEALTH_BADGE[status ?? ''] ?? 'border-surface-border text-ink-secondary';
  return (
    <span
      className={
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' + cls
      }
    >
      {status ?? '—'}
    </span>
  );
}
