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
import type { AnimalsKpis } from '@/lib/db/animals';

const PEN_COLORS: Record<string, string> = {
  farrowing: '#E85D26', // brand orange
  gestation: '#C42368', // brand magenta
  grower: '#D4A04A', // gold
  nursery: '#5B9B6B', // sage
  finisher: '#A8D96C', // lime
  boar: '#6B7280',
  isolation: '#FF453A',
  unknown: '#9CA3AF',
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#FF453A',
  High: '#E85D26',
  Medium: '#FFD60A',
  Low: '#34C759',
};

export function AnimalsKpis({ data }: { data: AnimalsKpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiHerd data={data.herd} />
      <KpiTemperature data={data.temperature} />
      <KpiActivity data={data.activity} />
      <KpiAlerts data={data.alerts} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — Active Herd with donut by pen type
// ---------------------------------------------------------------------------

function KpiHerd({ data }: { data: AnimalsKpis['herd'] }) {
  const pieData = data.by_pen_type.map((d) => ({
    name: d.pen_type,
    value: d.count,
    color: PEN_COLORS[d.pen_type] ?? PEN_COLORS.unknown,
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Active Herd
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.total.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-ink-muted">animals tracked</p>
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
          {data.by_pen_type.slice(0, 4).map((d) => (
            <div
              key={d.pen_type}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      PEN_COLORS[d.pen_type] ?? PEN_COLORS.unknown,
                  }}
                />
                <span className="capitalize text-ink-secondary">
                  {d.pen_type}
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
// Card 2 — Body Temperature with histogram
// ---------------------------------------------------------------------------

function KpiTemperature({ data }: { data: AnimalsKpis['temperature'] }) {
  const histData = data.distribution_24h.filter((d) => d.count > 0);
  const isAlert = data.high_count > 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Body Temperature · 24h
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.avg !== null ? `${data.avg.toFixed(2)}°C` : '—'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.min !== null && data.max !== null
                ? `range ${data.min.toFixed(1)}–${data.max.toFixed(1)}`
                : 'no readings'}
            </p>
          </div>
          <div
            className={
              'rounded-md border px-2 py-1 text-xs ' +
              (isAlert
                ? 'border-rose-400/40 text-rose-400'
                : 'border-emerald-400/40 text-emerald-400')
            }
          >
            {data.high_count > 0
              ? `${data.high_count} >39.5°C`
              : 'all normal'}
          </div>
        </div>
        <div className="mt-3 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histData}>
              <Bar dataKey="count" fill="#E85D26" radius={[2, 2, 0, 0]}>
                {histData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      Number(entry.bucket) > 39.5 ? '#FF453A' : '#E85D26'
                    }
                  />
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
                labelFormatter={(l) => `${l}°C`}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — Activity with sparkline
// ---------------------------------------------------------------------------

function KpiActivity({ data }: { data: AnimalsKpis['activity'] }) {
  const isAlert = data.low_count > 10;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Activity · 24h
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.avg !== null ? data.avg.toFixed(1) : '—'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">avg score</p>
          </div>
          <div
            className={
              'rounded-md border px-2 py-1 text-xs ' +
              (isAlert
                ? 'border-amber-400/40 text-amber-400'
                : 'border-emerald-400/40 text-emerald-400')
            }
          >
            {data.low_count > 0 ? `${data.low_count} <60` : 'all active'}
          </div>
        </div>
        <div className="mt-3 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series_24h}>
              <defs>
                <linearGradient id="actGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C42368" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#C42368" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="avg"
                stroke="#C42368"
                strokeWidth={2}
                fill="url(#actGradient)"
              />
              <Tooltip
                cursor={{ stroke: '#C42368', strokeWidth: 1 }}
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
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — Open Alerts by severity
// ---------------------------------------------------------------------------

function KpiAlerts({ data }: { data: AnimalsKpis['alerts'] }) {
  const ordered: { severity: string; count: number }[] = [
    'Critical',
    'High',
    'Medium',
    'Low',
  ].map((sev) => ({
    severity: sev,
    count: data.by_severity.find((s) => s.severity === sev)?.count ?? 0,
  }));
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Open Alerts
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.total_open.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.animals_affected}{' '}
              {data.animals_affected === 1 ? 'animal' : 'animals'} affected
            </p>
          </div>
          <div className="h-16 w-20 shrink-0">
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
              className="rounded border border-surface-border px-1 py-0.5 text-center"
              style={{ borderColor: SEVERITY_COLORS[e.severity] + '40' }}
            >
              <div
                className="text-base font-display tabular-nums"
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
      </CardContent>
    </Card>
  );
}
