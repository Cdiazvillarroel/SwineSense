'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Home,
  ExternalLink,
  Radio,
  Battery,
  Wifi,
  WifiOff,
  Calendar,
  Activity,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DeviceDetail, AlertSeverity } from '@/lib/db/devices';

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

const TYPE_LABELS: Record<string, string> = {
  ear_tag: 'Ear tag',
  env_probe: 'Env probe',
  silo_sensor: 'Silo sensor',
  water_flow: 'Water flow',
  camera: 'Camera',
  gateway: 'Gateway',
};

const TABS = ['Overview', 'Telemetry', 'Alerts', 'Maintenance'] as const;
type Tab = (typeof TABS)[number];

const C_BG = '#1A1E26';
const C_BORDER = '#2C323C';
const C_INK_DIM = '#9E978C';

function batteryTone(b: number | null): string {
  if (b === null) return 'text-ink-muted';
  if (b < 15) return 'text-status-critical font-semibold';
  if (b < 30) return 'text-orange-400';
  if (b < 50) return 'text-amber-400';
  return 'text-status-success';
}

function relativeTime(iso: string | null): {
  label: string;
  isStale: boolean;
} {
  if (!iso) return { label: 'never', isStale: true };
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return { label: 'just now', isStale: false };
  if (min < 60) return { label: `${min}m ago`, isStale: false };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { label: `${hr}h ago`, isStale: hr >= 2 };
  const d = Math.floor(hr / 24);
  return { label: `${d}d ago`, isStale: true };
}

export function DeviceDrawer({ detail }: { detail: DeviceDetail }) {
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
      next.delete('device');
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
                Device
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 font-display text-xl">
                <Radio className="h-5 w-5 text-brand-orange" />
                <span className="truncate font-mono">{detail.serial_number}</span>
                <span className="rounded-full border border-surface-border px-2 py-0.5 text-xs uppercase tracking-wider text-ink-secondary">
                  {TYPE_LABELS[detail.device_type] ?? detail.device_type}
                </span>
                {!detail.active && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
                    inactive
                  </span>
                )}
              </h2>
              <p className="mt-1 flex items-center gap-3 text-sm text-ink-secondary">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <Link
                    href={`/sites?site=${detail.site_id}`}
                    className="hover:text-brand-orange"
                  >
                    {detail.site_name}
                  </Link>
                </span>
                {detail.pen_id && detail.pen_name && (
                  <span className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    <Link
                      href={`/pens?pen=${detail.pen_id}`}
                      className="hover:text-brand-orange"
                    >
                      {detail.pen_name}
                    </Link>
                  </span>
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

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <Stat label="Model" value={detail.model ?? '—'} />
            <Stat
              label="Battery"
              value={
                detail.battery_status !== null
                  ? `${detail.battery_status}%`
                  : '—'
              }
              tone={batteryTone(detail.battery_status)}
            />
            <Stat
              label="Signal"
              value={detail.signal_status ?? '—'}
              capitalize
            />
            <Stat
              label="Last seen"
              value={relativeTime(detail.last_seen).label}
              tone={
                relativeTime(detail.last_seen).isStale ? 'text-amber-400' : ''
              }
            />
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex border-b border-surface-border px-5">
          {TABS.map((t) => {
            const active = t === tab;
            const count =
              t === 'Alerts' && detail.related_alerts.length > 0
                ? detail.related_alerts.length
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
          {tab === 'Telemetry' && <TelemetryTab detail={detail} />}
          {tab === 'Alerts' && <AlertsTab detail={detail} />}
          {tab === 'Maintenance' && <MaintenanceTab detail={detail} />}
        </div>
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  capitalize,
}: {
  label: string;
  value: string;
  tone?: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="uppercase tracking-wider text-ink-muted">{label}</p>
      <p
        className={
          'mt-0.5 text-ink-primary ' +
          (tone ?? '') +
          ' ' +
          (capitalize ? 'capitalize' : '')
        }
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Overview
// ---------------------------------------------------------------------------

function OverviewTab({ detail }: { detail: DeviceDetail }) {
  const last = relativeTime(detail.last_seen);
  return (
    <div className="space-y-6">
      {/* Status tiles */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          icon={
            <Battery
              className={'h-4 w-4 ' + batteryTone(detail.battery_status)}
            />
          }
          label="Battery"
          value={
            detail.battery_status !== null
              ? `${detail.battery_status}%`
              : '—'
          }
          tone={batteryTone(detail.battery_status)}
        />
        <Tile
          icon={
            detail.signal_status === 'offline' ? (
              <WifiOff className="h-4 w-4 text-status-critical" />
            ) : (
              <Wifi
                className={
                  'h-4 w-4 ' +
                  (detail.signal_status === 'online'
                    ? 'text-status-success'
                    : 'text-amber-400')
                }
              />
            )
          }
          label="Signal"
          value={detail.signal_status ?? '—'}
          capitalize
        />
        <Tile
          icon={<Activity className="h-4 w-4 text-ink-secondary" />}
          label="Last seen"
          value={last.label}
          tone={last.isStale ? 'text-amber-400' : ''}
        />
        <Tile
          icon={<Calendar className="h-4 w-4 text-ink-secondary" />}
          label="Installed"
          value={
            detail.install_date
              ? new Date(detail.install_date).toLocaleDateString()
              : '—'
          }
        />
      </section>

      {/* Linked entity (only ear_tag has animal link) */}
      {detail.linked_animal_id && (
        <section>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
            Linked animal
          </h3>
          <Link
            href={`/animals?animal=${detail.linked_animal_id}`}
            className="flex items-center justify-between rounded-md border border-surface-border bg-white/[0.03] p-3 transition-colors hover:border-brand-orange/40"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-ink-primary">
                {detail.linked_animal_tag}
              </span>
              {detail.linked_animal_health && (
                <span
                  className={
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] capitalize ' +
                    (HEALTH_BADGE[detail.linked_animal_health] ??
                      'border-surface-border text-ink-secondary')
                  }
                >
                  {detail.linked_animal_health}
                </span>
              )}
            </div>
            <ExternalLink className="h-4 w-4 text-ink-muted" />
          </Link>
        </section>
      )}

      {/* Specs */}
      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
          Specs
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-surface-border bg-white/[0.03] p-3 text-sm">
          <SpecRow label="Type" value={TYPE_LABELS[detail.device_type] ?? detail.device_type} />
          <SpecRow label="Model" value={detail.model ?? '—'} />
          <SpecRow label="Firmware" value={detail.firmware_version ?? '—'} />
          <SpecRow label="Site" value={detail.site_name} />
          {detail.pen_name && <SpecRow label="Pen" value={detail.pen_name} />}
          {detail.pen_type && (
            <SpecRow label="Pen type" value={detail.pen_type} capitalize />
          )}
        </dl>
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

function Tile({
  icon,
  label,
  value,
  tone,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-md border border-surface-border bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-muted">
        {icon}
        {label}
      </div>
      <p
        className={
          'mt-1 font-display text-lg tabular-nums ' +
          (tone ?? 'text-ink-primary') +
          ' ' +
          (capitalize ? 'capitalize' : '')
        }
      >
        {value}
      </p>
    </div>
  );
}

function SpecRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd
        className={
          'text-ink-primary ' + (capitalize ? 'capitalize' : '')
        }
      >
        {value}
      </dd>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab — Telemetry
// ---------------------------------------------------------------------------

function TelemetryTab({ detail }: { detail: DeviceDetail }) {
  if (detail.device_type === 'ear_tag') {
    if (detail.earTagSeries.length === 0) {
      return (
        <p className="text-sm text-ink-muted">
          No telemetry from this ear tag in the last 7 days.
        </p>
      );
    }
    return (
      <div className="space-y-6">
        <ChartSection
          title="Body temperature"
          unit="°C"
          data={detail.earTagSeries}
          dataKey="body_temp"
          color="#FF453A"
          thresholds={[
            { y: 39.0, label: 'Watch', color: '#FFD60A' },
            { y: 39.5, label: 'Fever', color: '#FF453A' },
          ]}
        />
        <ChartSection
          title="Activity"
          unit="score"
          data={detail.earTagSeries}
          dataKey="activity"
          color="#34C759"
          thresholds={[
            { y: 60, label: 'Low', color: '#FFD60A' },
          ]}
        />
      </div>
    );
  }

  if (detail.device_type === 'env_probe') {
    if (detail.envProbeSeries.length === 0) {
      return (
        <p className="text-sm text-ink-muted">
          No environmental telemetry from this probe in the last 7 days.
        </p>
      );
    }
    return (
      <div className="space-y-6">
        <ChartSection
          title="Temperature-Humidity Index (THI)"
          unit="THI"
          data={detail.envProbeSeries}
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
          data={detail.envProbeSeries}
          dataKey="temp"
          color="#FFD60A"
        />
        <ChartSection
          title="Humidity"
          unit="%"
          data={detail.envProbeSeries}
          dataKey="humidity"
          color="#3B82F6"
        />
        <ChartSection
          title="Ammonia (NH₃)"
          unit="ppm"
          data={detail.envProbeSeries}
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
          data={detail.envProbeSeries}
          dataKey="ventilation"
          color="#5B9B6B"
        />
      </div>
    );
  }

  // silo_sensor and other types: no telemetry pipeline yet
  return (
    <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-400">
      Telemetry for{' '}
      <span className="font-semibold">
        {TYPE_LABELS[detail.device_type] ?? detail.device_type}
      </span>{' '}
      devices is not yet wired up. Last seen and battery are still tracked in
      the Overview tab.
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
  data: Array<Record<string, unknown> & { bucket: string }>;
  dataKey: string;
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
              dataKey={dataKey}
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

// ---------------------------------------------------------------------------
// Tab — Alerts
// ---------------------------------------------------------------------------

function AlertsTab({ detail }: { detail: DeviceDetail }) {
  if (detail.related_alerts.length === 0) {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 px-4 py-6 text-center">
        <p className="text-sm text-emerald-400">
          No alerts have referenced this device.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {detail.related_alerts.map((a) => (
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
          {a.trigger_reason && (
            <p className="mt-2 rounded border border-surface-border bg-white/[0.02] p-2 text-xs italic text-ink-secondary">
              {a.trigger_reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab — Maintenance
// ---------------------------------------------------------------------------

function MaintenanceTab({ detail }: { detail: DeviceDetail }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
          Lifecycle
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-surface-border bg-white/[0.03] p-3 text-sm">
          <SpecRow
            label="Install date"
            value={
              detail.install_date
                ? new Date(detail.install_date).toLocaleDateString()
                : '—'
            }
          />
          <SpecRow
            label="Created in system"
            value={
              detail.created_at
                ? new Date(detail.created_at).toLocaleDateString()
                : '—'
            }
          />
          <SpecRow label="Firmware" value={detail.firmware_version ?? '—'} />
          <SpecRow label="Status" value={detail.active ? 'Active' : 'Inactive'} />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
          Notes
        </h3>
        {detail.notes ? (
          <p className="whitespace-pre-wrap rounded-md border border-surface-border bg-white/[0.03] p-3 text-sm text-ink-secondary">
            {detail.notes}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            No notes recorded for this device.
          </p>
        )}
      </section>

      <section className="rounded-md border border-surface-border bg-white/[0.02] p-3 text-xs text-ink-muted">
        Editing maintenance records, firmware updates, and notes is not yet
        available from the dashboard. Use the database directly until the write
        flow is implemented.
      </section>
    </div>
  );
}
