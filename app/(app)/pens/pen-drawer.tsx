'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Wind,
  Droplet,
  Thermometer,
  AlertTriangle,
  ExternalLink,
  Home,
  Activity,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ThiGauge } from '@/app/(app)/sites/thi-gauge';
import { THI_CATEGORY_COLOR, type ThiCategory } from '@/lib/weather';
import type { PenDetailData, AlertSeverity, PenAnimal } from '@/lib/db/pens';

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

const HEALTH_BADGE: Record<string, string> = {
  healthy: 'border-emerald-400/40 text-emerald-400',
  monitoring: 'border-amber-400/40 text-amber-400',
  sick: 'border-rose-400/40 text-rose-400',
  recovering: 'border-sky-400/40 text-sky-400',
  deceased: 'border-ink-muted/40 text-ink-muted',
};

const TABS = ['Overview', 'Climate', 'Animals', 'Alerts'] as const;
type Tab = (typeof TABS)[number];

const C_BG = '#1A1E26';
const C_BORDER = '#2C323C';
const C_INK_DIM = '#9E978C';

export function PenDrawer({ detail }: { detail: PenDetailData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('Overview');

  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('pen');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 220);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <button
        onClick={close}
        aria-label="Close drawer"
        className={
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ' +
          (open ? 'opacity-100' : 'opacity-0')
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={
          'absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l shadow-2xl ' +
          'transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
        style={{ backgroundColor: C_BG, borderColor: C_BORDER }}
      >
        {/* Header */}
        <header className="border-b border-surface-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-ink-muted">
                Pen
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 font-display text-2xl">
                <Home className="h-5 w-5 text-brand-orange" />
                <span className="truncate">{detail.pen_name}</span>
                <span className="rounded-full border border-surface-border px-2 py-0.5 text-xs uppercase tracking-wider text-ink-secondary">
                  {detail.pen_type}
                </span>
              </h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-secondary">
                <Building2 className="h-3.5 w-3.5" />
                <Link
                  href={`/sites?site=${detail.site_id}`}
                  className="hover:text-brand-orange"
                >
                  {detail.site_name}
                </Link>
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

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <Stat
              label="Animals"
              value={`${detail.animals_active}${detail.capacity ? ` / ${detail.capacity}` : ''}`}
            />
            <Stat label="Ventilation" value={detail.ventilation_type ?? '—'} />
            <Stat label="Water" value={detail.water_source ?? '—'} />
            <Stat
              label="Devices online"
              value={`${detail.devices_online}/${detail.devices_total}`}
            />
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex border-b border-surface-border px-5">
          {TABS.map((t) => {
            const active = t === tab;
            const count =
              t === 'Alerts' && detail.recent_alerts.length > 0
                ? detail.recent_alerts.length
                : t === 'Animals' && detail.animals.length > 0
                  ? detail.animals.length
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
                  <span
                    className={
                      'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ' +
                      (t === 'Alerts'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-white/10 text-ink-secondary')
                    }
                  >
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
          {tab === 'Climate' && <ClimateTab detail={detail} />}
          {tab === 'Animals' && <AnimalsTab detail={detail} />}
          {tab === 'Alerts' && <AlertsTab detail={detail} />}
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

function OverviewTab({ detail }: { detail: PenDetailData }) {
  const ammoniaWarning =
    detail.current_ammonia !== null && detail.current_ammonia > 25;
  const ammoniaDanger =
    detail.current_ammonia !== null && detail.current_ammonia > 50;

  return (
    <div className="space-y-6">
      {/* Top: gauge + reading tiles */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-md border border-surface-border bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-ink-muted">
            Current THI
          </p>
          <ThiGauge value={detail.current_thi} size={200} />
          {detail.last_reading_at && (
            <p className="mt-1 text-[10px] text-ink-muted">
              {new Date(detail.last_reading_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ReadingTile
            icon={<Thermometer className="h-3.5 w-3.5" />}
            label="Ambient temp"
            value={
              detail.current_temp !== null
                ? `${detail.current_temp.toFixed(1)}°C`
                : '—'
            }
          />
          <ReadingTile
            icon={<Droplet className="h-3.5 w-3.5" />}
            label="Humidity"
            value={
              detail.current_humidity !== null
                ? `${detail.current_humidity.toFixed(0)}%`
                : '—'
            }
          />
          <ReadingTile
            icon={<span className="text-xs">NH₃</span>}
            label="Ammonia"
            value={
              detail.current_ammonia !== null
                ? `${detail.current_ammonia.toFixed(1)} ppm`
                : '—'
            }
            warning={ammoniaWarning && !ammoniaDanger}
            danger={ammoniaDanger}
          />
          <ReadingTile
            icon={<Wind className="h-3.5 w-3.5" />}
            label="Ventilation"
            value={
              detail.current_ventilation !== null
                ? detail.current_ventilation.toFixed(0)
                : '—'
            }
            warning={
              detail.current_ventilation !== null &&
              detail.current_ventilation < 60
            }
          />
          <ReadingTile
            icon={<Thermometer className="h-3.5 w-3.5" />}
            label="Avg body temp · 24h"
            value={
              detail.avg_body_temp_24h !== null
                ? `${detail.avg_body_temp_24h.toFixed(2)}°C`
                : '—'
            }
            warning={
              detail.avg_body_temp_24h !== null &&
              detail.avg_body_temp_24h > 39.0
            }
          />
          <ReadingTile
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Avg activity · 24h"
            value={
              detail.avg_activity_24h !== null
                ? detail.avg_activity_24h.toFixed(0)
                : '—'
            }
            warning={
              detail.avg_activity_24h !== null &&
              detail.avg_activity_24h < 60
            }
          />
        </div>
      </section>

      {/* Open alerts banner */}
      {detail.open_alerts > 0 && (
        <section>
          <div
            className="flex items-start gap-2 rounded-md border p-3 text-sm"
            style={{
              borderColor:
                detail.critical_alerts > 0
                  ? '#FF453A60'
                  : detail.highest_severity
                    ? SEVERITY_BADGE[detail.highest_severity].includes('orange')
                      ? '#E85D2660'
                      : '#FFD60A60'
                    : '#9E978C60',
              backgroundColor:
                detail.critical_alerts > 0 ? '#FF453A10' : '#FFD60A10',
            }}
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{
                color: detail.critical_alerts > 0 ? '#FF453A' : '#FFD60A',
              }}
            />
            <div>
              <p className="font-semibold text-ink-primary">
                {detail.open_alerts} open alert
                {detail.open_alerts > 1 ? 's' : ''}
                {detail.critical_alerts > 0 &&
                  ` · ${detail.critical_alerts} critical`}
              </p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Switch to the Alerts tab to see AI insights and recommended
                actions.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 24h THI sparkline */}
      <section>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-ink-muted">
          THI · last 24h
        </h3>
        <MiniSeries
          data={detail.thi_series_24h}
          color={
            detail.thi_category
              ? THI_CATEGORY_COLOR[detail.thi_category]
              : '#9E978C'
          }
          height={120}
        />
      </section>

      {detail.notes && (
        <section>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
            Notes
          </h3>
          <p className="rounded-md border border-surface-border bg-white/[0.03] p-3 text-sm text-ink-secondary">
            {detail.notes}
          </p>
        </section>
      )}
    </div>
  );
}

function ReadingTile({
  icon,
  label,
  value,
  warning,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? 'border-rose-500/40 text-rose-400'
    : warning
      ? 'border-amber-500/40 text-amber-400'
      : 'border-surface-border text-ink-primary';
  return (
    <div className={'rounded-md border bg-white/[0.03] p-3 ' + tone}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-display text-xl tabular-nums">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Climate
// ---------------------------------------------------------------------------

function ClimateTab({ detail }: { detail: PenDetailData }) {
  if (detail.series_7d.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No environmental telemetry in the last 7 days.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <ChartSection
        title="Temperature-Humidity Index (THI)"
        unit="THI"
        data={detail.series_7d}
        dataKey="thi"
        color="#E85D26"
        thresholds={[
          { y: 74, label: 'Alert', color: '#FFD60A' },
          { y: 79, label: 'Danger', color: '#E85D26' },
          { y: 84, label: 'Emergency', color: '#FF453A' },
        ]}
      />
      <ChartSection
        title="Ambient temperature"
        unit="°C"
        data={detail.series_7d}
        dataKey="temp"
        color="#FFD60A"
      />
      <ChartSection
        title="Humidity"
        unit="%"
        data={detail.series_7d}
        dataKey="humidity"
        color="#3B82F6"
      />
      <ChartSection
        title="Ammonia (NH₃)"
        unit="ppm"
        data={detail.series_7d}
        dataKey="ammonia"
        color="#C42368"
        thresholds={[
          { y: 25, label: 'Concerning', color: '#FFD60A' },
          { y: 50, label: 'Dangerous', color: '#FF453A' },
        ]}
      />
      <ChartSection
        title="Ventilation score"
        unit="score"
        data={detail.series_7d}
        dataKey="ventilation"
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
  thresholds,
}: {
  title: string;
  unit: string;
  data: PenDetailData['series_7d'];
  dataKey: keyof PenDetailData['series_7d'][number];
  color: string;
  thresholds?: { y: number; label: string; color: string }[];
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
      <div className="h-40 w-full">
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
            {thresholds?.map((t) => (
              <ReferenceLine
                key={t.y}
                y={t.y}
                stroke={t.color}
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            ))}
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
  color,
  height,
}: {
  data: { hour: string; avg: number }[];
  color: string;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-ink-muted"
      >
        No data in the last 24h
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="penThi24Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C_BORDER} strokeDasharray="2 4" />
          <XAxis
            dataKey="hour"
            tickFormatter={(v: string) =>
              new Date(v).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            }
            fontSize={10}
            stroke={C_INK_DIM}
            tick={{ fill: C_INK_DIM }}
            interval="preserveStartEnd"
          />
          <YAxis
            fontSize={10}
            stroke={C_INK_DIM}
            tick={{ fill: C_INK_DIM }}
            domain={['auto', 'auto']}
            width={32}
          />
          <ReferenceArea y1={0} y2={74} fill="#34C759" fillOpacity={0.04} />
          <ReferenceArea y1={74} y2={79} fill="#FFD60A" fillOpacity={0.06} />
          <ReferenceArea y1={79} y2={84} fill="#E85D26" fillOpacity={0.06} />
          <ReferenceArea y1={84} y2={100} fill="#FF453A" fillOpacity={0.06} />
          <Area
            type="monotone"
            dataKey="avg"
            stroke={color}
            strokeWidth={2}
            fill="url(#penThi24Grad)"
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
                hour: '2-digit',
                minute: '2-digit',
              })
            }
            formatter={(v: number) => [v.toFixed(1), 'THI']}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Animals
// ---------------------------------------------------------------------------

function AnimalsTab({ detail }: { detail: PenDetailData }) {
  if (detail.animals.length === 0) {
    return <p className="text-sm text-ink-muted">No animals in this pen.</p>;
  }

  // Sort: alerts first, then by tag
  const sorted = [...detail.animals].sort((a, b) => {
    if (a.open_alerts !== b.open_alerts) return b.open_alerts - a.open_alerts;
    return a.tag_number.localeCompare(b.tag_number);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-2 py-2 font-medium">Tag</th>
            <th className="px-2 py-2 font-medium">Health</th>
            <th className="px-2 py-2 text-right font-medium">Weight</th>
            <th className="px-2 py-2 text-right font-medium">Last temp</th>
            <th className="px-2 py-2 text-right font-medium">Activity</th>
            <th className="px-2 py-2 font-medium">Alerts</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <AnimalRow key={a.id} animal={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnimalRow({ animal }: { animal: PenAnimal }) {
  const tempTone =
    animal.last_temp === null
      ? 'text-ink-muted'
      : animal.last_temp > 39.5
        ? 'text-rose-400 font-semibold'
        : animal.last_temp > 39.0
          ? 'text-amber-400'
          : 'text-ink-primary';
  const actTone =
    animal.last_activity === null
      ? 'text-ink-muted'
      : animal.last_activity < 50
        ? 'text-rose-400 font-semibold'
        : animal.last_activity < 70
          ? 'text-amber-400'
          : 'text-ink-primary';

  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="px-2 py-2 font-mono text-ink-primary">{animal.tag_number}</td>
      <td className="px-2 py-2">
        <span
          className={
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] capitalize ' +
            (HEALTH_BADGE[animal.health_status ?? ''] ??
              'border-surface-border text-ink-secondary')
          }
        >
          {animal.health_status ?? '—'}
        </span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-ink-secondary">
        {animal.weight_kg !== null ? `${animal.weight_kg} kg` : '—'}
      </td>
      <td className={'px-2 py-2 text-right tabular-nums ' + tempTone}>
        {animal.last_temp !== null ? `${animal.last_temp.toFixed(2)}°` : '—'}
      </td>
      <td className={'px-2 py-2 text-right tabular-nums ' + actTone}>
        {animal.last_activity !== null
          ? animal.last_activity.toFixed(0)
          : '—'}
      </td>
      <td className="px-2 py-2">
        {animal.open_alerts > 0 ? (
          <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-rose-400">
            {animal.open_alerts}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-right">
        <Link
          href={`/animals?animal=${animal.id}`}
          className="inline-flex items-center gap-0.5 text-[11px] text-ink-secondary hover:text-brand-orange"
        >
          Open <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Tab — Alerts
// ---------------------------------------------------------------------------

function AlertsTab({ detail }: { detail: PenDetailData }) {
  if (detail.recent_alerts.length === 0) {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 px-4 py-6 text-center">
        <p className="text-sm text-emerald-400">No open alerts in this pen.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {detail.recent_alerts.map((a) => (
        <div
          key={a.id}
          className="rounded-md border border-surface-border bg-white/[0.03] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className={
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ' +
                  SEVERITY_BADGE[a.severity]
                }
              >
                {a.severity}
              </span>
              <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
                {a.alert_type}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-muted">
                {new Date(a.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <Link
                href={`/alerts/${a.id}`}
                className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-ink-secondary hover:text-brand-orange"
              >
                Open <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
          {a.short_message && (
            <p className="mt-2 text-sm text-ink-primary">{a.short_message}</p>
          )}
          {a.ai_insight && (
            <p className="mt-2 rounded border border-surface-border bg-white/[0.02] p-2 text-xs italic text-ink-secondary">
              {a.ai_insight}
            </p>
          )}
          {a.recommended_action && (
            <p className="mt-2 rounded border border-surface-border bg-white/[0.02] p-2 text-xs text-ink-secondary">
              <span className="font-semibold text-ink-primary">Action: </span>
              {a.recommended_action}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
