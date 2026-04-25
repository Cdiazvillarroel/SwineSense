'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  User,
  Wind,
  Droplet,
  Thermometer,
  Cloud,
  AlertTriangle,
  Radio,
  ExternalLink,
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
import { ThiGauge } from './thi-gauge';
import {
  THI_CATEGORY_COLOR,
  THI_CATEGORY_LABEL,
  type SiteWeather,
  type ThiCategory,
} from '@/lib/weather';
import type { SiteDetailData, AlertSeverity } from '@/lib/db/sites';

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

const TABS = ['Overview', 'Climate', 'Alerts', 'Pens'] as const;
type Tab = (typeof TABS)[number];

const C_BG = '#1A1E26';
const C_BORDER = '#2C323C';
const C_INK_DIM = '#9E978C';

export function SiteDrawer({
  detail,
  weather,
}: {
  detail: SiteDetailData;
  weather: SiteWeather | null;
}) {
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
      next.delete('site');
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
                Site
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 font-display text-2xl">
                <Building2 className="h-5 w-5 text-brand-orange" />
                <span className="truncate">{detail.site_name}</span>
              </h2>
            </div>
            <button
              onClick={close}
              className="rounded-btn border border-surface-border px-2 py-1 text-sm text-ink-secondary transition-colors hover:border-brand-orange/40 hover:text-brand-orange"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {detail.manager_name && (
              <span className="flex items-center gap-1 text-ink-secondary">
                <User className="h-3 w-3" />
                {detail.manager_name}
              </span>
            )}
            {detail.manager_phone && (
              <span className="flex items-center gap-1 text-ink-secondary">
                <Phone className="h-3 w-3" />
                {detail.manager_phone}
              </span>
            )}
            {detail.location_address && (
              <span className="flex items-center gap-1 text-ink-secondary">
                <MapPin className="h-3 w-3" />
                {detail.location_address}
              </span>
            )}
            <span className="flex items-center gap-1 font-mono text-ink-muted">
              <Clock className="h-3 w-3" />
              {detail.timezone}
            </span>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex border-b border-surface-border px-5">
          {TABS.map((t) => {
            const active = t === tab;
            const count =
              t === 'Alerts' && detail.recent_alerts.length > 0
                ? detail.recent_alerts.length
                : t === 'Pens' && detail.pens.length > 0
                  ? detail.pens.length
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

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'Overview' && (
            <OverviewTab detail={detail} weather={weather} />
          )}
          {tab === 'Climate' && (
            <ClimateTab detail={detail} weather={weather} />
          )}
          {tab === 'Alerts' && <AlertsTab detail={detail} />}
          {tab === 'Pens' && <PensTab detail={detail} />}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  detail,
  weather,
}: {
  detail: SiteDetailData;
  weather: SiteWeather | null;
}) {
  return (
    <div className="space-y-6">
      {/* Top row: THI gauge + key counts */}
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
            warning={
              detail.current_ammonia !== null && detail.current_ammonia > 25
            }
            danger={
              detail.current_ammonia !== null && detail.current_ammonia > 50
            }
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
        </div>
      </section>

      {/* Outdoor weather */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
          <Cloud className="h-3.5 w-3.5" />
          Outdoor weather · live
        </h3>
        {weather ? (
          <WeatherSummary weather={weather} />
        ) : (
          <div className="rounded-md border border-surface-border bg-white/[0.03] p-4 text-sm text-ink-muted">
            Weather data unavailable.
          </div>
        )}
      </section>

      {/* Site KPI snapshot */}
      {detail.kpi && (
        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-ink-muted">
            Site status
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile
              label="Status"
              value={detail.kpi.overall_status ?? '—'}
            />
            <KpiTile
              label="At risk"
              value={String(detail.kpi.animals_at_risk ?? 0)}
            />
            <KpiTile
              label="Devices off"
              value={String(detail.kpi.devices_offline ?? 0)}
              warning={(detail.kpi.devices_offline ?? 0) > 0}
            />
            <KpiTile
              label="Low battery"
              value={String(detail.kpi.devices_low_battery ?? 0)}
              warning={(detail.kpi.devices_low_battery ?? 0) > 0}
            />
          </div>
        </section>
      )}

      {/* 24h THI trend */}
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

function WeatherSummary({ weather }: { weather: SiteWeather }) {
  const c = weather.current;
  const w = weather.heat_stress_warning;
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-surface-border bg-white/[0.03] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="font-display text-3xl tabular-nums">
              {c.temp_c.toFixed(1)}°C
            </p>
            <p className="mt-1 text-sm text-ink-secondary capitalize">
              {c.weather_label} · {c.is_day ? 'Day' : 'Night'}
            </p>
          </div>
          <div className="text-right text-xs text-ink-muted">
            <p>
              <span className="tabular-nums text-ink-primary">
                {c.humidity.toFixed(0)}%
              </span>{' '}
              humidity
            </p>
            <p className="mt-1">
              <span className="tabular-nums text-ink-primary">
                {c.wind_kph.toFixed(0)} km/h
              </span>{' '}
              wind
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3 text-xs">
          <span className="uppercase tracking-wider text-ink-muted">
            Outdoor THI
          </span>
          <span
            className="font-display text-lg tabular-nums"
            style={{ color: THI_CATEGORY_COLOR[c.thi_category] }}
          >
            {c.thi.toFixed(1)} · {THI_CATEGORY_LABEL[c.thi_category]}
          </span>
        </div>
      </div>

      {w && (
        <div
          className="flex items-start gap-2 rounded-md border p-3 text-sm"
          style={{
            borderColor: THI_CATEGORY_COLOR[w.expected_category] + '60',
            backgroundColor: THI_CATEGORY_COLOR[w.expected_category] + '10',
          }}
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: THI_CATEGORY_COLOR[w.expected_category] }}
          />
          <div>
            <p
              className="font-semibold"
              style={{ color: THI_CATEGORY_COLOR[w.expected_category] }}
            >
              Heat stress likely in ~{w.hours_from_now}h
            </p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Expected outdoor THI {w.expected_thi.toFixed(1)} (
              {THI_CATEGORY_LABEL[w.expected_category]}) at{' '}
              {new Date(w.expected_at).toLocaleString([], {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Pre-emptive ventilation/cooling recommended.
            </p>
          </div>
        </div>
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

function KpiTile({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={
        'rounded-md border p-3 ' +
        (warning ? 'border-amber-400/40' : 'border-surface-border')
      }
    >
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p
        className={
          'mt-1 font-display text-base capitalize ' +
          (warning ? 'text-amber-400' : 'text-ink-primary')
        }
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Climate (full charts)
// ---------------------------------------------------------------------------

function ClimateTab({
  detail,
  weather,
}: {
  detail: SiteDetailData;
  weather: SiteWeather | null;
}) {
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

      {weather && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
            <Cloud className="h-3.5 w-3.5" />
            Outdoor THI forecast · next 48h
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weather.forecast_48h}>
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#3B82F6"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor="#3B82F6"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C_BORDER} strokeDasharray="2 4" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleString([], {
                      weekday: 'short',
                      hour: '2-digit',
                    })
                  }
                  fontSize={11}
                  stroke={C_INK_DIM}
                  tick={{ fill: C_INK_DIM }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  fontSize={11}
                  stroke={C_INK_DIM}
                  tick={{ fill: C_INK_DIM }}
                  domain={['auto', 'auto']}
                  width={42}
                />
                <ReferenceLine y={74} stroke="#FFD60A" strokeDasharray="3 3" />
                <ReferenceLine y={79} stroke="#E85D26" strokeDasharray="3 3" />
                <ReferenceLine y={84} stroke="#FF453A" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="thi"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#fcGrad)"
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
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                    })
                  }
                  formatter={(v: number) => [v.toFixed(1), 'Outdoor THI']}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
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
  data: SiteDetailData['series_7d'];
  dataKey: keyof SiteDetailData['series_7d'][number];
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
            <linearGradient id="thi24Grad" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#thi24Grad)"
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
// Tab — Alerts
// ---------------------------------------------------------------------------

function AlertsTab({ detail }: { detail: SiteDetailData }) {
  if (detail.recent_alerts.length === 0) {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 px-4 py-6 text-center">
        <p className="text-sm text-emerald-400">
          No open alerts at this site.
        </p>
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

// ---------------------------------------------------------------------------
// Tab — Pens
// ---------------------------------------------------------------------------

function PensTab({ detail }: { detail: SiteDetailData }) {
  if (detail.pens.length === 0) {
    return <p className="text-sm text-ink-muted">No pens at this site.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-2 py-2 font-medium">Pen</th>
            <th className="px-2 py-2 font-medium">Type</th>
            <th className="px-2 py-2 text-right font-medium">Animals</th>
            <th className="px-2 py-2 text-right font-medium">Temp</th>
            <th className="px-2 py-2 text-right font-medium">RH</th>
            <th className="px-2 py-2 text-right font-medium">THI</th>
            <th className="px-2 py-2 text-right font-medium">NH₃</th>
          </tr>
        </thead>
        <tbody>
          {detail.pens.map((p) => {
            const thiColor: ThiCategory | null =
              p.last_thi !== null
                ? p.last_thi < 74
                  ? 'comfort'
                  : p.last_thi < 79
                    ? 'alert'
                    : p.last_thi < 84
                      ? 'danger'
                      : 'emergency'
                : null;
            return (
              <tr
                key={p.id}
                className="border-b border-surface-border last:border-0"
              >
                <td className="px-2 py-2 text-ink-primary">{p.pen_name}</td>
                <td className="px-2 py-2 text-ink-secondary">
                  <span className="rounded border border-surface-border px-1.5 py-0.5 text-[10px] capitalize">
                    {p.pen_type}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-secondary">
                  {p.current_animals ?? 0}
                  {p.capacity ? (
                    <span className="text-ink-muted">/{p.capacity}</span>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-primary">
                  {p.last_temp !== null ? `${p.last_temp.toFixed(1)}°` : '—'}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-primary">
                  {p.last_humidity !== null
                    ? `${p.last_humidity.toFixed(0)}%`
                    : '—'}
                </td>
                <td
                  className="px-2 py-2 text-right tabular-nums font-semibold"
                  style={{
                    color: thiColor ? THI_CATEGORY_COLOR[thiColor] : undefined,
                  }}
                >
                  {p.last_thi !== null ? p.last_thi.toFixed(1) : '—'}
                </td>
                <td
                  className={
                    'px-2 py-2 text-right tabular-nums ' +
                    (p.last_ammonia !== null && p.last_ammonia > 25
                      ? 'text-amber-400'
                      : 'text-ink-primary')
                  }
                >
                  {p.last_ammonia !== null
                    ? p.last_ammonia.toFixed(1)
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-ink-muted">
        <Radio className="h-3 w-3" />
        Latest readings within last 7 days
      </p>
    </div>
  );
}
