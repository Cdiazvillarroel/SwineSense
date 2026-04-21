import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { KpiOverview, RiskLevel } from '@/lib/types/domain';

/**
 * KPI repository.
 *
 * Provides:
 *  - the latest KPI snapshot per site (for Executive Overview cards)
 *  - historical series of a single KPI (for trend charts)
 *
 * All numeric indices (health_risk_index, etc.) are on a 0-10 scale as
 * written by sp_compute_daily_kpis.
 */

interface KpiRow {
  date: string;
  site_id: string;
  pens_monitored: number | null;
  animals_monitored: number | null;
  environments_monitored: number | null;
  open_alerts: number | null;
  in_progress_alerts: number | null;
  closed_alerts: number | null;
  high_alerts: number | null;
  critical_alerts: number | null;
  animals_at_risk: number | null;
  feed_risk_index: number | null;
  health_risk_index: number | null;
  environment_risk_index: number | null;
  operational_risk_index: number | null;
  devices_offline: number | null;
  devices_low_battery: number | null;
  data_freshness_minutes: number | null;
  overall_status: RiskLevel | null;
}

function mapKpi(row: KpiRow): KpiOverview {
  return {
    date: row.date,
    siteId: row.site_id,
    pensMonitored: row.pens_monitored ?? 0,
    animalsMonitored: row.animals_monitored ?? 0,
    environmentsMonitored: row.environments_monitored ?? 0,
    openAlerts: row.open_alerts ?? 0,
    inProgressAlerts: row.in_progress_alerts ?? 0,
    closedAlerts: row.closed_alerts ?? 0,
    highAlerts: row.high_alerts ?? 0,
    criticalAlerts: row.critical_alerts ?? 0,
    animalsAtRisk: row.animals_at_risk ?? 0,
    feedRiskIndex: row.feed_risk_index,
    healthRiskIndex: row.health_risk_index,
    environmentRiskIndex: row.environment_risk_index,
    operationalRiskIndex: row.operational_risk_index,
    devicesOffline: row.devices_offline ?? 0,
    devicesLowBattery: row.devices_low_battery ?? 0,
    dataFreshnessMinutes: row.data_freshness_minutes,
    overallStatus: row.overall_status,
  };
}

/**
 * Latest KPI for a site (most recent date).
 * Returns null if no KPI has been computed yet.
 */
export async function getLatestKpi(siteId: string): Promise<KpiOverview | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kpi_overview')
    .select('*')
    .eq('site_id', siteId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getLatestKpi: ${error.message}`);
  return data ? mapKpi(data as KpiRow) : null;
}

/**
 * Latest KPI across ALL sites the user can see — used by the global
 * overview when no site is selected.
 */
export async function getAggregatedKpi(): Promise<KpiOverview | null> {
  const supabase = createClient();

  // Get the most recent date that exists for the user
  const { data: recent, error: e1 } = await supabase
    .from('kpi_overview')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (e1) throw new Error(`getAggregatedKpi: ${e1.message}`);
  if (!recent) return null;

  const { data, error } = await supabase
    .from('kpi_overview')
    .select('*')
    .eq('date', (recent as { date: string }).date);

  if (error) throw new Error(`getAggregatedKpi: ${error.message}`);
  if (!data || data.length === 0) return null;

  // Aggregate across all rows of that day
  const rows = data as KpiRow[];
  const sum = <K extends keyof KpiRow>(k: K): number =>
    rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
  const avg = <K extends keyof KpiRow>(k: K): number | null => {
    // Extract numeric values without a type predicate — TypeScript can't
    // narrow KpiRow[K] to `number` because K spans columns of varying types
    // (string, RiskLevel, etc). We collect matches manually instead.
    const vals: number[] = [];
    for (const r of rows) {
      const v = r[k];
      if (typeof v === 'number') vals.push(v);
    }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  return {
    date: rows[0]!.date,
    siteId: 'ALL',
    pensMonitored: sum('pens_monitored'),
    animalsMonitored: sum('animals_monitored'),
    environmentsMonitored: sum('environments_monitored'),
    openAlerts: sum('open_alerts'),
    inProgressAlerts: sum('in_progress_alerts'),
    closedAlerts: sum('closed_alerts'),
    highAlerts: sum('high_alerts'),
    criticalAlerts: sum('critical_alerts'),
    animalsAtRisk: sum('animals_at_risk'),
    feedRiskIndex: avg('feed_risk_index'),
    healthRiskIndex: avg('health_risk_index'),
    environmentRiskIndex: avg('environment_risk_index'),
    operationalRiskIndex: avg('operational_risk_index'),
    devicesOffline: sum('devices_offline'),
    devicesLowBattery: sum('devices_low_battery'),
    dataFreshnessMinutes: avg('data_freshness_minutes'),
    overallStatus: null,
  };
}

/**
 * Historical series for a single KPI metric. Used by charts.
 */
export async function getKpiSeries(
  siteId: string,
  metric: keyof Pick<
    KpiOverview,
    | 'healthRiskIndex'
    | 'environmentRiskIndex'
    | 'operationalRiskIndex'
    | 'feedRiskIndex'
    | 'openAlerts'
    | 'criticalAlerts'
    | 'animalsAtRisk'
  >,
  days = 30,
): Promise<{ date: string; value: number | null }[]> {
  const columnMap: Record<string, string> = {
    healthRiskIndex: 'health_risk_index',
    environmentRiskIndex: 'environment_risk_index',
    operationalRiskIndex: 'operational_risk_index',
    feedRiskIndex: 'feed_risk_index',
    openAlerts: 'open_alerts',
    criticalAlerts: 'critical_alerts',
    animalsAtRisk: 'animals_at_risk',
  };

  const col = columnMap[metric];
  if (!col) throw new Error(`Unknown metric: ${metric}`);

  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('kpi_overview')
    .select(`date, ${col}`)
    .eq('site_id', siteId)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true });

  if (error) throw new Error(`getKpiSeries: ${error.message}`);

  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      date: r.date as string,
      value: r[col] as number | null,
    };
  });
}
