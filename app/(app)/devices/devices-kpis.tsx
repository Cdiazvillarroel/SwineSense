'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type { DevicesKpis, BatteryBucket } from '@/lib/db/devices';

const DEVICE_TYPE_COLORS: Record<string, string> = {
  ear_tag: '#E85D26',
  env_probe: '#3B82F6',
  silo_sensor: '#D4A04A',
  water_flow: '#06B6D4',
  camera: '#A855F7',
  gateway: '#6B7280',
};

const SIGNAL_COLORS = {
  online: '#34C759',
  degraded: '#FFD60A',
  offline: '#FF453A',
};

const BATTERY_COLORS: Record<BatteryBucket, string> = {
  critical: '#FF453A',
  low: '#E85D26',
  medium: '#FFD60A',
  healthy: '#34C759',
};

const BATTERY_LABELS: Record<BatteryBucket, string> = {
  critical: '<15%',
  low: '<30%',
  medium: '<50%',
  healthy: '≥50%',
};

const PEN_TYPE_LABELS: Record<string, string> = {
  ear_tag: 'Ear tag',
  env_probe: 'Env probe',
  silo_sensor: 'Silo sensor',
  water_flow: 'Water flow',
  camera: 'Camera',
  gateway: 'Gateway',
};

export function DevicesKpisGrid({ data }: { data: DevicesKpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiFleet data={data.fleet} />
      <KpiSignal data={data.signal} />
      <KpiBattery data={data.battery} />
      <KpiBySite data={data.by_site} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — Fleet
// ---------------------------------------------------------------------------

function KpiFleet({ data }: { data: DevicesKpis['fleet'] }) {
  const pieData = data.by_type.map((d) => ({
    name: PEN_TYPE_LABELS[d.device_type] ?? d.device_type,
    value: d.count,
    color: DEVICE_TYPE_COLORS[d.device_type] ?? '#9CA3AF',
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Fleet
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.total_active}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.total_inactive > 0 && `· ${data.total_inactive} inactive`}
              {data.total_inactive === 0 && 'all active'}
            </p>
          </div>
          <div className="h-16 w-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={18}
                  outerRadius={30}
                  paddingAngle={1}
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {data.by_type.slice(0, 4).map((d) => (
            <div
              key={d.device_type}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      DEVICE_TYPE_COLORS[d.device_type] ?? '#9CA3AF',
                  }}
                />
                <span className="text-ink-secondary">
                  {PEN_TYPE_LABELS[d.device_type] ?? d.device_type}
                </span>
              </span>
              <span className="tabular-nums text-ink-primary">{d.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 2 — Signal
// ---------------------------------------------------------------------------

function KpiSignal({ data }: { data: DevicesKpis['signal'] }) {
  const total = data.online + data.degraded + data.offline;
  const onlinePctSafe = total > 0 ? (data.online / total) * 100 : 0;
  const degradedPctSafe = total > 0 ? (data.degraded / total) * 100 : 0;
  const offlinePctSafe = total > 0 ? (data.offline / total) * 100 : 0;

  const tone =
    data.online_pct >= 99
      ? 'text-status-success'
      : data.online_pct >= 95
        ? 'text-amber-400'
        : 'text-status-critical';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Signal Health
            </p>
            <p className={'mt-1 font-display text-3xl tabular-nums ' + tone}>
              {data.online_pct.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.online} online
              {data.degraded > 0 && ` · ${data.degraded} degraded`}
              {data.offline > 0 && ` · ${data.offline} offline`}
            </p>
          </div>
        </div>
        {/* Stacked horizontal bar */}
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-card">
          <div
            style={{
              width: `${onlinePctSafe}%`,
              backgroundColor: SIGNAL_COLORS.online,
            }}
          />
          <div
            style={{
              width: `${degradedPctSafe}%`,
              backgroundColor: SIGNAL_COLORS.degraded,
            }}
          />
          <div
            style={{
              width: `${offlinePctSafe}%`,
              backgroundColor: SIGNAL_COLORS.offline,
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
          <SignalCell
            color={SIGNAL_COLORS.online}
            label="Online"
            value={data.online}
          />
          <SignalCell
            color={SIGNAL_COLORS.degraded}
            label="Degraded"
            value={data.degraded}
          />
          <SignalCell
            color={SIGNAL_COLORS.offline}
            label="Offline"
            value={data.offline}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SignalCell({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div
      className="rounded border px-1 py-0.5"
      style={{ borderColor: color + '40' }}
    >
      <div className="font-display text-base tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — Battery
// ---------------------------------------------------------------------------

function KpiBattery({ data }: { data: DevicesKpis['battery'] }) {
  const tone =
    data.avg === null
      ? 'text-ink-muted'
      : data.avg >= 50
        ? 'text-status-success'
        : data.avg >= 30
          ? 'text-amber-400'
          : 'text-status-critical';

  const ordered: BatteryBucket[] = ['healthy', 'medium', 'low', 'critical'];
  const bars = ordered.map((b) => ({
    name: BATTERY_LABELS[b],
    value: data.by_bucket.find((x) => x.bucket === b)?.count ?? 0,
    color: BATTERY_COLORS[b],
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Battery Health
            </p>
            <p className={'mt-1 font-display text-3xl tabular-nums ' + tone}>
              {data.avg !== null ? `${data.avg.toFixed(0)}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.critical > 0 && (
                <span className="text-status-critical">
                  {data.critical} critical · 
                </span>
              )}
              {data.low > 0 ? `${data.low} low` : 'no low battery'}
            </p>
          </div>
        </div>
        <div className="mt-3 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {bars.map((b, i) => (
                  <Cell key={i} fill={b.color} />
                ))}
              </Bar>
              <XAxis
                dataKey="name"
                fontSize={9}
                stroke="#9E978C"
                tick={{ fill: '#9E978C' }}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  background: '#1A1E26',
                  border: '1px solid #2C323C',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, 'devices']}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — By Site
// ---------------------------------------------------------------------------

function KpiBySite({ data }: { data: DevicesKpis['by_site'] }) {
  const totalIssues = data.reduce((s, d) => s + d.issues, 0);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              By Site
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.length}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {totalIssues > 0 ? (
                <span className="text-amber-400">
                  {totalIssues} device{totalIssues > 1 ? 's' : ''} need attention
                </span>
              ) : (
                'all healthy'
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {data.map((s) => {
            const pct = data[0] ? (s.total / data[0].total) * 100 : 0;
            return (
              <div key={s.site_id} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-ink-secondary">
                    {s.site_name}
                  </span>
                  <span className="ml-2 tabular-nums text-ink-primary">
                    {s.total}
                    {s.issues > 0 && (
                      <span className="ml-1 rounded bg-amber-400/15 px-1 text-amber-400">
                        {s.issues} ⚠
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-card">
                  <div
                    className="h-full rounded-full bg-brand-orange/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
