'use client';

import { Card, CardContent } from '@/components/ui/card';
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
  Area,
  AreaChart,
} from 'recharts';
import {
  THI_CATEGORY_COLOR,
  THI_CATEGORY_LABEL,
  type ThiCategory,
} from '@/lib/weather';
import type { SitesKpis } from '@/lib/db/sites';

const SITE_PALETTE = ['#E85D26', '#C42368', '#D4A04A', '#5B9B6B', '#3B82F6'];
const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#FF453A',
  High: '#E85D26',
  Medium: '#FFD60A',
  Low: '#34C759',
};

export function SitesKpisGrid({ data }: { data: SitesKpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiFleet data={data.fleet} />
      <KpiClimate data={data.climate} />
      <KpiThi data={data.thi} />
      <KpiAir data={data.air} alerts={data.alerts} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — Fleet overview
// ---------------------------------------------------------------------------

function KpiFleet({ data }: { data: SitesKpis['fleet'] }) {
  const pieData = data.animals_by_site.map((d, i) => ({
    name: d.site_name,
    value: d.count,
    color: SITE_PALETTE[i % SITE_PALETTE.length]!,
  }));
  const onlinePct =
    data.devices_total > 0
      ? Math.round((data.devices_online / data.devices_total) * 100)
      : 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Fleet
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.total_sites}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.total_animals} animals · {data.total_pens} pens
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
          {data.animals_by_site.slice(0, 3).map((d, i) => (
            <div
              key={d.site_name}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: SITE_PALETTE[i % SITE_PALETTE.length],
                  }}
                />
                <span className="truncate text-ink-secondary">
                  {d.site_name}
                </span>
              </span>
              <span className="tabular-nums text-ink-primary">{d.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-surface-border pt-2 text-[10px] text-ink-muted">
          {data.devices_online}/{data.devices_total} devices online ·{' '}
          <span
            className={
              onlinePct >= 95
                ? 'text-emerald-400'
                : onlinePct >= 80
                  ? 'text-amber-400'
                  : 'text-rose-400'
            }
          >
            {onlinePct}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 2 — Climate (temp/humidity)
// ---------------------------------------------------------------------------

function KpiClimate({ data }: { data: SitesKpis['climate'] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Climate · 24h
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.avg_temp_24h !== null
                ? `${data.avg_temp_24h.toFixed(1)}°C`
                : '—'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              avg ambient temp
            </p>
          </div>
          <div className="rounded-md border border-surface-border px-2 py-1 text-xs text-ink-secondary">
            <span className="tabular-nums text-ink-primary">
              {data.avg_humidity_24h !== null
                ? `${data.avg_humidity_24h.toFixed(0)}%`
                : '—'}
            </span>
            <span className="ml-1 text-[10px] uppercase tracking-wider text-ink-muted">
              RH
            </span>
          </div>
        </div>
        <div className="mt-3 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.temp_series_24h}>
              <defs>
                <linearGradient id="climGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85D26" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#E85D26" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="avg"
                stroke="#E85D26"
                strokeWidth={2}
                fill="url(#climGrad)"
              />
              <Tooltip
                cursor={{ stroke: '#E85D26', strokeWidth: 1 }}
                contentStyle={{
                  background: '#1A1E26',
                  border: '1px solid #2C323C',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(l: string) =>
                  new Date(l).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }
                formatter={(v: number) => [`${v.toFixed(1)}°C`, 'Avg temp']}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — THI heat stress
// ---------------------------------------------------------------------------

function KpiThi({ data }: { data: SitesKpis['thi'] }) {
  const overallCategory: ThiCategory | null =
    data.avg_24h === null
      ? null
      : data.avg_24h < 74
        ? 'comfort'
        : data.avg_24h < 79
          ? 'alert'
          : data.avg_24h < 84
            ? 'danger'
            : 'emergency';

  const bars = data.by_site.map((s) => ({
    name: s.site_name,
    value: s.avg_thi ?? 0,
    color: s.category ? THI_CATEGORY_COLOR[s.category] : '#2C323C',
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Heat Stress · THI
            </p>
            <p
              className="mt-1 font-display text-3xl tabular-nums"
              style={{
                color: overallCategory
                  ? THI_CATEGORY_COLOR[overallCategory]
                  : undefined,
              }}
            >
              {data.avg_24h !== null ? data.avg_24h.toFixed(1) : '—'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {overallCategory
                ? `${THI_CATEGORY_LABEL[overallCategory]} · max ${data.max_24h?.toFixed(1) ?? '—'}`
                : 'no data'}
            </p>
          </div>
          {data.sites_in_alert > 0 && (
            <div className="rounded-md border border-amber-400/40 px-2 py-1 text-xs text-amber-400">
              {data.sites_in_alert} site{data.sites_in_alert > 1 ? 's' : ''} ↑
            </div>
          )}
        </div>
        <div className="mt-3 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {bars.map((b, i) => (
                  <Cell key={i} fill={b.color} />
                ))}
              </Bar>
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  background: '#1A1E26',
                  border: '1px solid #2C323C',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v.toFixed(1), 'THI']}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — Air quality + alerts
// ---------------------------------------------------------------------------

function KpiAir({
  data,
  alerts,
}: {
  data: SitesKpis['air'];
  alerts: SitesKpis['alerts'];
}) {
  const ammoniaConcerning =
    data.avg_ammonia_24h !== null && data.avg_ammonia_24h > 25;

  const ordered = ['Critical', 'High', 'Medium', 'Low'].map((sev) => ({
    severity: sev,
    count: alerts.by_severity.find((s) => s.severity === sev)?.count ?? 0,
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Air Quality · Alerts
            </p>
            <p
              className={
                'mt-1 font-display text-3xl tabular-nums ' +
                (ammoniaConcerning ? 'text-amber-400' : '')
              }
            >
              {data.avg_ammonia_24h !== null
                ? `${data.avg_ammonia_24h.toFixed(0)}`
                : '—'}
              <span className="ml-1 text-base font-normal text-ink-secondary">
                ppm
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              NH₃ avg · vent{' '}
              {data.avg_ventilation_24h !== null
                ? data.avg_ventilation_24h.toFixed(0)
                : '—'}
            </p>
          </div>
          <div className="h-14 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordered} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="severity" hide />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {ordered.map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1 text-[10px]">
          {ordered.map((e) => (
            <div
              key={e.severity}
              className="rounded border px-1 py-0.5 text-center"
              style={{ borderColor: SEVERITY_COLORS[e.severity] + '40' }}
            >
              <div
                className="font-display text-base tabular-nums"
                style={{ color: SEVERITY_COLORS[e.severity] }}
              >
                {e.count}
              </div>
              <div className="uppercase tracking-wider text-ink-muted">
                {e.severity.slice(0, 4)}
              </div>
            </div>
          ))}
        </div>
        {data.concerning_readings > 0 && (
          <p className="mt-2 text-[10px] text-amber-400">
            ⚠ {data.concerning_readings} readings &gt; 25 ppm
          </p>
        )}
      </CardContent>
    </Card>
  );
}
