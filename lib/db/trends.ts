import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Trends repository.
 *
 * Emits time series for the /trends page. Supports:
 *  - site-level or pen-level granularity
 *  - animal metrics (body temp, activity, feed intake)
 *  - environment metrics (ambient temp, humidity, THI, heat stress hours)
 */

export type AnimalMetric =
  | 'avg_body_temp'
  | 'max_body_temp'
  | 'avg_activity'
  | 'avg_feed_intake'
  | 'fever_suspects';

export type EnvironmentMetric =
  | 'avg_ambient_temp'
  | 'max_ambient_temp'
  | 'avg_humidity'
  | 'avg_thi'
  | 'max_thi'
  | 'heat_stress_hours';

export interface TrendPoint {
  date: string;
  value: number | null;
  penId?: string | null;
  penName?: string;
}

export interface TrendQuery {
  siteId: string;
  penIds?: string[];       // if provided, one series per pen
  from: string;            // YYYY-MM-DD inclusive
  to: string;
}

async function fetchSeries(
  table: 'animal_daily_avg' | 'environment_daily_avg',
  metric: string,
  query: TrendQuery,
): Promise<TrendPoint[]> {
  const supabase = createClient();

  let q = supabase
    .from(table)
    .select(`date, pen_id, ${metric}, pens:pen_id(pen_name)`)
    .eq('site_id', query.siteId)
    .gte('date', query.from)
    .lte('date', query.to)
    .order('date', { ascending: true });

  if (query.penIds?.length) q = q.in('pen_id', query.penIds);

  const { data, error } = await q;
  if (error) throw new Error(`${table}.${metric}: ${error.message}`);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const pens = r.pens as { pen_name: string } | null;
    return {
      date: r.date as string,
      value: (r[metric] as number | null) ?? null,
      penId: (r.pen_id as string | null) ?? null,
      penName: pens?.pen_name,
    };
  });
}

export function getAnimalTrend(metric: AnimalMetric, query: TrendQuery) {
  return fetchSeries('animal_daily_avg', metric, query);
}

export function getEnvironmentTrend(metric: EnvironmentMetric, query: TrendQuery) {
  return fetchSeries('environment_daily_avg', metric, query);
}

/**
 * Alert count per day — used for the "alert count over time" chart.
 */
export async function getAlertCountSeries(
  siteId: string,
  from: string,
  to: string,
): Promise<TrendPoint[]> {
  const supabase = createClient();

  // Postgres function would be cleaner; for MVP we aggregate client-side.
  const { data, error } = await supabase
    .from('alerts')
    .select('timestamp, severity')
    .eq('site_id', siteId)
    .gte('timestamp', `${from}T00:00:00Z`)
    .lte('timestamp', `${to}T23:59:59Z`);

  if (error) throw new Error(`getAlertCountSeries: ${error.message}`);

  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const day = ((row as { timestamp: string }).timestamp).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}
