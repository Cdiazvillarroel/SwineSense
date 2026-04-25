'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnimalDetail, AlertSeverity } from '@/lib/db/animals';

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

const TABS = ['Overview', 'Trends', 'Alerts', 'Device'] as const;
type Tab = (typeof TABS)[number];

// Colors used by tooltips & charts (kept literal to avoid relying on tokens)
const C_BG = '#1A1E26';
const C_BORDER = '#2C323C';
const C_INK_DIM = '#9E978C';

export function AnimalDrawer({ detail }: { detail: AnimalDetail }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('Overview');

  // open=false initially → translates off-screen → after mount, set to true → slides in
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    setOpen(false);
    // Wait for slide-out before navigating away
    setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('animal');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 220);
  };

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const a = detail.animal;
  const ageDays = a.birth_date
    ? Math.floor(
        (Date.now() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        onClick={close}
        aria-label="Close drawer"
        className={
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ' +
          (open ? 'opacity-100' : 'opacity-0')
        }
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={
          'absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l shadow-2xl ' +
          'transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
        style={{ backgroundColor: C_BG, borderColor: C_BORDER }}
      >
        {/* Header */}
        <header className="border-b border-surface-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-muted">
                Animal
              </p>
              <h2 className="mt-0.5 font-display text-2xl">
                <span className="font-mono">{a.tag_number}</span>
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {a.site_name ?? '—'}
                {a.pen_name && (
                  <>
                    {' · '}
                    {a.pen_name}{' '}
                    <span className="text-ink-muted">
                      ({a.pen_type ?? '—'})
                    </span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={close}
              className="rounded-btn border border-surface-border px-2 py-1 text-sm text-ink-secondary transition-colors hover:border-brand-orange/40 hover:text-brand-orange"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Stat label="Health" value={a.health_status ?? '—'} />
            <Stat
              label="Weight"
              value={a.weight_kg ? `${a.weight_kg} kg` : '—'}
            />
            <Stat label="Age" value={ageDays !== null ? `${ageDays}d` : '—'} />
            <Stat label="Sex" value={a.sex ?? '—'} />
            <Stat label="Breed" value={a.breed ?? '—'} />
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex border-b border-surface-border px-5">
          {TABS.map((t) => {
            const active = t === tab;
            const count =
              t === 'Alerts' && detail.open_alerts.length > 0
                ? detail.open_alerts.length
                : null;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  'relative px-3 py-3 text-sm transition-colors ' +
                  (active
                    ? 'text-brand-orange'
                    : 'text-ink-secondary hover:text-ink-primary')
                }
              >
                {t}
                {count !== null && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-rose-500/15 px-1.5 text-[10px] font-semibold tabular-nums text-rose-400">
                    {count}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'Overview' && <OverviewTab detail={detail} />}
          {tab === 'Trends' && <TrendsTab detail={detail} />}
          {tab === 'Alerts' && <AlertsTab detail={detail} />}
          {tab === 'Device' && <DeviceTab detail={detail} />}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-0.5 capitalize text-ink-primary">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Overview
// ---------------------------------------------------------------------------

function OverviewTab({ detail }: { detail: AnimalDetail }) {
  const r = detail.last_reading;
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-ink-muted">
          Last reading
          {r &&
            ` · ${new Date(r.timestamp).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}`}
        </h3>
        {!r ? (
          <p className="text-sm text-ink-muted">
            No readings in the last 7 days.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ReadingTile
              label="Body temperature"
              value={r.body_temp_c}
              unit="°C"
              warning={r.body_temp_c !== null && r.body_temp_c > 39.5}
              attention={
                r.body_temp_c !== null &&
                r.body_temp_c > 39.0 &&
                r.body_temp_c <= 39.5
              }
              digits={2}
            />
            <ReadingTile
              label="Activity"
              value={r.activity}
              unit=""
              warning={r.activity !== null && r.activity < 50}
              attention={
                r.activity !== null && r.activity >= 50 && r.activity < 70
              }
              digits={0}
            />
            <ReadingTile
              label="Feed intake"
              value={r.feed_intake_g}
              unit="g"
              digits={0}
            />
            <ReadingTile
              label="Water"
              value={r.water_intake_ml}
              unit="ml"
              digits={0}
            />
          </div>
        )}
      </section>

      {detail.open_alerts.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-ink-muted">
            Open alerts ({detail.open_alerts.length})
          </h3>
          <div className="space-y-2">
            {detail.open_alerts.slice(0, 3).map((al) => (
              <AlertRow key={al.id} alert={al} compact />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-ink-muted">
          Last 7 days · activity
        </h3>
        <MiniSeries
          data={detail.series_7d}
          dataKey="activity"
          color="#C42368"
          height={120}
        />
      </section>
    </div>
  );
}

function ReadingTile({
  label,
  value,
  unit,
  warning,
  attention,
  digits = 1,
}: {
  label: string;
  value: number | null;
  unit: string;
  warning?: boolean;
  attention?: boolean;
  digits?: number;
}) {
  const tone = warning
    ? 'border-rose-500/40 text-rose-400'
    : attention
      ? 'border-amber-500/40 text-amber-400'
      : 'border-surface-border text-ink-primary';
  return (
    <div className={'rounded-md border bg-white/[0.03] p-3 ' + tone}>
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl tabular-nums">
        {value !== null ? value.toFixed(digits) : '—'}
        {value !== null && unit && (
          <span className="ml-1 text-base font-normal text-ink-secondary">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Trends (full charts)
// ---------------------------------------------------------------------------

function TrendsTab({ detail }: { detail: AnimalDetail }) {
  if (detail.series_7d.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No telemetry in the last 7 days.</p>
    );
  }
  return (
    <div className="space-y-6">
      <ChartSection
        title="Body temperature"
        unit="°C"
        data={detail.series_7d}
        dataKey="body_temp_c"
        color="#E85D26"
        normalRange={[38.0, 39.5]}
      />
      <ChartSection
        title="Activity"
        unit="score"
        data={detail.series_7d}
        dataKey="activity"
        color="#C42368"
      />
      <ChartSection
        title="Feed intake"
        unit="g"
        data={detail.series_7d}
        dataKey="feed_intake_g"
        color="#D4A04A"
      />
      <ChartSection
        title="Water intake"
        unit="ml"
        data={detail.series_7d}
        dataKey="water_intake_ml"
        color="#5B9B6B"
      />
    </div>
  );
}

function ChartSection({
  title,
  unit,
  data,
  dataKey,
  color,
  normalRange,
}: {
  title: string;
  unit: string;
  data: AnimalDetail['series_7d'];
  dataKey: keyof AnimalDetail['series_7d'][number];
  color: string;
  normalRange?: [number, number];
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs uppercase tracking-wider text-ink-muted">
          {title}
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          {unit}
        </span>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke={C_BORDER} strokeDasharray="2 4" />
            <XAxis
              dataKey="bucket"
              tickFormatter={(v: string) =>
                new Date(v).toLocaleDateString([], {
                  month: 'numeric',
                  day: 'numeric',
                })
              }
              fontSize={11}
              stroke={C_INK_DIM}
              tick={{ fill: C_INK_DIM }}
            />
            <YAxis
              fontSize={11}
              stroke={C_INK_DIM}
              tick={{ fill: C_INK_DIM }}
              domain={['auto', 'auto']}
              width={42}
            />
            {normalRange && (
              <ReferenceArea
                y1={normalRange[0]}
                y2={normalRange[1]}
                fill="#34C759"
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            <Tooltip
              contentStyle={{
                background: C_BG,
                border: `1px solid ${C_BORDER}`,
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(v: string) =>
                new Date(v).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                })
              }
            />
            <Line
              type="monotone"
              dataKey={dataKey as string}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MiniSeries({
  data,
  dataKey,
  color,
  height,
}: {
  data: AnimalDetail['series_7d'];
  dataKey: keyof AnimalDetail['series_7d'][number];
  color: string;
  height: number;
}) {
  const gradId = 'g-' + (dataKey as string);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            connectNulls
          />
          <Tooltip
            contentStyle={{
              background: C_BG,
              border: `1px solid ${C_BORDER}`,
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(v: string) =>
              new Date(v).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
              })
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Alerts
// ---------------------------------------------------------------------------

function AlertsTab({ detail }: { detail: AnimalDetail }) {
  if (detail.open_alerts.length === 0) {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 px-4 py-6 text-center">
        <p className="text-sm text-emerald-400">
          No open alerts for this animal.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {detail.open_alerts.map((a) => (
        <AlertRow key={a.id} alert={a} />
      ))}
    </div>
  );
}

function AlertRow({
  alert,
  compact,
}: {
  alert: AnimalDetail['open_alerts'][number];
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-surface-border bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ' +
              SEVERITY_BADGE[alert.severity]
            }
          >
            {alert.severity}
          </span>
          <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
            {alert.alert_type}
          </p>
        </div>
        <p className="text-xs text-ink-muted">
          {new Date(alert.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {alert.short_message && (
        <p className="mt-2 text-sm text-ink-primary">{alert.short_message}</p>
      )}
      {!compact && alert.recommended_action && (
        <p className="mt-2 rounded border border-surface-border bg-white/[0.02] p-2 text-xs text-ink-secondary">
          <span className="font-semibold text-ink-primary">Action: </span>
          {alert.recommended_action}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Device
// ---------------------------------------------------------------------------

function DeviceTab({ detail }: { detail: AnimalDetail }) {
  if (!detail.device) {
    return (
      <p className="text-sm text-ink-muted">
        No device assigned to this animal.
      </p>
    );
  }
  const d = detail.device;
  const battery = d.battery_status ?? 0;
  const batteryColor =
    battery < 20 ? '#FF453A' : battery < 50 ? '#FFD60A' : '#34C759';
  const signalColor =
    d.signal_status === 'offline'
      ? '#FF453A'
      : d.signal_status === 'degraded'
        ? '#FFD60A'
        : '#34C759';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DeviceField label="Serial" value={d.serial_number ?? '—'} mono />
        <DeviceField label="Model" value={d.model ?? '—'} />
        <DeviceField
          label="Battery"
          value={d.battery_status !== null ? `${d.battery_status}%` : '—'}
          color={batteryColor}
        />
        <DeviceField
          label="Signal"
          value={d.signal_status ?? '—'}
          color={signalColor}
        />
        <DeviceField
          label="Last seen"
          value={
            d.last_seen
              ? new Date(d.last_seen).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'
          }
        />
      </div>
    </div>
  );
}

function DeviceField({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-surface-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p
        className={'mt-1 text-sm capitalize ' + (mono ? 'font-mono' : '')}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
