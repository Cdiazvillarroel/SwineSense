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
} from 'recharts';
import {
  THI_CATEGORY_COLOR,
  THI_CATEGORY_LABEL,
  type ThiCategory,
} from '@/lib/weather';
import type { PensKpis } from '@/lib/db/pens';

const PEN_TYPE_COLORS: Record<string, string> = {
  farrowing: '#E85D26',
  gestation: '#C42368',
  grower: '#D4A04A',
  nursery: '#5B9B6B',
  finisher: '#A8D96C',
  boar: '#6B7280',
  isolation: '#FF453A',
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#FF453A',
  High: '#E85D26',
  Medium: '#FFD60A',
  Low: '#34C759',
};

const VENT_COLORS: Record<string, string> = {
  Mechanical: '#3B82F6',
  Natural: '#5B9B6B',
};

export function PensKpisGrid({ data }: { data: PensKpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiFleet data={data.fleet} />
      <KpiThi data={data.thi} />
      <KpiAir data={data.air} />
      <KpiAlerts data={data.alerts} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — Fleet (pens count + occupancy)
// ---------------------------------------------------------------------------

function KpiFleet({ data }: { data: PensKpis['fleet'] }) {
  const pieData = data.by_pen_type.map((d) => ({
    name: d.pen_type,
    value: d.count,
    color: PEN_TYPE_COLORS[d.pen_type] ?? '#9CA3AF',
  }));
  const occupancyPct =
    data.total_capacity > 0
      ? Math.round((data.total_current / data.total_capacity) * 100)
      : 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Pens
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">
              {data.total_pens}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.total_current}/{data.total_capacity} ({occupancyPct}% full)
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
          {data.by_pen_type.slice(0, 4).map((d) => (
            <div
              key={d.pen_type}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: PEN_TYPE_COLORS[d.pen_type] ?? '#9CA3AF',
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
// Card 2 — THI by pen type
// ---------------------------------------------------------------------------

function KpiThi({ data }: { data: PensKpis['thi'] }) {
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

  const bars = data.by_pen_type.map((d) => ({
    name: d.pen_type,
    value: d.avg_thi,
    color: THI_CATEGORY_COLOR[d.category],
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              THI · 24h avg
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
          {data.pens_in_alert > 0 && (
            <div className="rounded-md border border-amber-400/40 px-2 py-1 text-xs text-amber-400">
              {data.pens_in_alert} pen{data.pens_in_alert > 1 ? 's' : ''} ↑
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
                formatter={(v: number) => [v.toFixed(1), 'Avg THI']}
                labelFormatter={(l: string) => l}
              />
              <XAxis
                dataKey="name"
                fontSize={9}
                stroke="#9E978C"
                tick={{ fill: '#9E978C' }}
                interval={0}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — Air Quality (NH3 by ventilation type)
// ---------------------------------------------------------------------------

function KpiAir({ data }: { data: PensKpis['air'] }) {
  const ammoniaConcerning =
    data.avg_ammonia_24h !== null && data.avg_ammonia_24h > 25;

  const bars = data.by_ventilation_type.map((d) => ({
    name: d.ventilation_type,
    value: d.avg_nh3,
    color: VENT_COLORS[d.ventilation_type] ?? '#9CA3AF',
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Air Quality · NH₃
            </p>
            <p
              className={
                'mt-1 font-display text-3xl tabular-nums ' +
                (ammoniaConcerning ? 'text-amber-400' : '')
              }
            >
              {data.avg_ammonia_24h !== null
                ? data.avg_ammonia_24h.toFixed(1)
                : '—'}
              <span className="ml-1 text-base font-normal text-ink-secondary">
                ppm
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              vent{' '}
              {data.avg_ventilation_24h !== null
                ? data.avg_ventilation_24h.toFixed(0)
                : '—'}
              {data.concerning_readings > 0 && (
                <span className="ml-1 text-amber-400">
                  · {data.concerning_readings} &gt;25
                </span>
              )}
            </p>
          </div>
          <div className="h-16 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={50}
                  fontSize={9}
                  stroke="#9E978C"
                  tick={{ fill: '#9E978C' }}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
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
                  formatter={(v: number) => [`${v.toFixed(1)} ppm`, 'NH₃']}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — Open Alerts
// ---------------------------------------------------------------------------

function KpiAlerts({ data }: { data: PensKpis['alerts'] }) {
  const ordered = ['Critical', 'High', 'Medium', 'Low'].map((sev) => ({
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
              {data.total_open}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {data.pens_affected}{' '}
              {data.pens_affected === 1 ? 'pen' : 'pens'} affected
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
      </CardContent>
    </Card>
  );
}
