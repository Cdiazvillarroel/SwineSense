import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/charts/TrendChart';
import { trendsRepo } from '@/lib/db';
import { sitesRepo } from '@/lib/db';

export const metadata = { title: 'Trends' };

interface SearchParams {
  site?: string;
  metric?: string;
  days?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

type MetricDef = {
  label: string;
  key: string;
  kind: 'animal' | 'environment';
  unit?: string;
};

const METRICS: Record<string, MetricDef> = {
  avg_body_temp:    { label: 'Avg body temp',    key: 'avg_body_temp',    kind: 'animal',      unit: '°C' },
  max_body_temp:    { label: 'Max body temp',    key: 'max_body_temp',    kind: 'animal',      unit: '°C' },
  avg_activity:     { label: 'Avg activity',     key: 'avg_activity',     kind: 'animal' },
  avg_feed_intake:  { label: 'Feed intake',      key: 'avg_feed_intake',  kind: 'animal',      unit: 'g' },
  avg_thi:          { label: 'THI',              key: 'avg_thi',          kind: 'environment' },
  heat_stress_hours:{ label: 'Heat stress hours',key: 'heat_stress_hours',kind: 'environment', unit: 'h' },
};

export default async function TrendsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const metricKey = searchParams.metric ?? 'avg_body_temp';
  const metric = METRICS[metricKey] ?? METRICS.avg_body_temp!;
  const days = Math.min(180, Math.max(7, Number(searchParams.days ?? 30)));

  const sites = await sitesRepo.listSites();
  const siteId = searchParams.site ?? sites[0]?.id;

  if (!siteId) {
    return <EmptyState />;
  }

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const data = metric.kind === 'animal'
    ? await trendsRepo.getAnimalTrend(metric.key as never, { siteId, from, to })
    : await trendsRepo.getEnvironmentTrend(metric.key as never, { siteId, from, to });

  const byPen = new Map<string, { name: string; data: { date: string; value: number | null }[] }>();
  for (const p of data) {
    const key = p.penName ?? 'Unknown pen';
    if (!byPen.has(key)) byPen.set(key, { name: key, data: [] });
    byPen.get(key)!.data.push({ date: p.date, value: p.value });
  }

  const series = Array.from(byPen.values());

  return (
    <div className="space-y-6">
      <header>
        <p className="label-badge">Monitoring Trends</p>
        <h1 className="mt-1 font-display text-section">{metric.label}</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Last {days} days. {series.length} pens charted.
        </p>
      </header>

      <MetricSelector current={metricKey} days={days} siteId={siteId} />

      <Card>
        <CardHeader>
          <CardTitle>{metric.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              No data for this metric in the selected range.
            </p>
          ) : (
            <TrendChart series={series} unit={metric.unit} height={380} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricSelector({
  current,
  days,
  siteId,
}: {
  current: string;
  days: number;
  siteId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-card border border-surface-border bg-surface-card p-3">
      <span className="label-badge mr-1">Metric</span>
      {Object.entries(METRICS).map(([key, m]) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={`?site=${siteId}&metric=${key}&days=${days}`}
            className={
              active
                ? 'rounded-full border border-brand-orange bg-brand-orange/10 px-3 py-1 text-xs font-medium text-brand-orange'
                : 'rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary'
            }
          >
            {m.label}
          </Link>
        );
      })}

      <span className="mx-2 h-6 w-px bg-surface-border" />
      <span className="label-badge mr-1">Range</span>
      {[7, 30, 90].map((d) => (
        <Link
          key={d}
          href={`?site=${siteId}&metric=${current}&days=${d}`}
          className={
            d === days
              ? 'rounded-full border border-brand-orange bg-brand-orange/10 px-3 py-1 text-xs font-medium text-brand-orange'
              : 'rounded-full border border-surface-border px-3 py-1 text-xs font-medium text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary'
          }
        >
          {d}d
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-ink-muted">No sites available.</p>
    </div>
  );
}
