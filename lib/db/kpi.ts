import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { KpiOverview, RiskLevel } from '@/lib/types/domain';
import type {
  ActionItemSummary,
  FarmRiskScore,
  RiskCategory,
  RiskCategoryBreakdown,
  RiskDriver,
} from '@/lib/types/risk';

/**
 * KPI repository.
 *
 * Provides:
 *  - the latest KPI snapshot per site (for Executive Overview cards)
 *  - historical series of a single KPI (for trend charts)
 *  - risk breakdown by category (composite Farm Risk Score + 4 indices
 *    + alert drivers)
 *  - action items derived from Claude Opus's morning digest
 *
 * All numeric indices (health_risk_index, etc.) are on a 0-10 scale as
 * written by sp_compute_daily_kpis.
 *
 * NOTE: Risk-breakdown TYPES and CONSTANTS live in lib/types/risk.ts so
 * Client Components can import them without dragging in `server-only`.
 * They're re-exported below for callers that prefer to import everything
 * from `@/lib/db/kpi`.
 */

// =============================================================================
//  Re-export client-safe types and constants
// =============================================================================

export type {
  ActionItemSummary,
  FarmRiskScore,
  RiskCategory,
  RiskCategoryBreakdown,
  RiskDriver,
} from '@/lib/types/risk';

export {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_DESCRIPTIONS,
  DRIVER_LABELS,
} from '@/lib/types/risk';

// =============================================================================
//  Original KPI helpers
// =============================================================================

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

// =============================================================================
//  Risk Breakdown helpers (added 2026-04-23)
//
//  These power the "Farm Risk Score" section on the Overview page, which
//  separates the single composite risk into 4 categories and surfaces the
//  alert drivers behind each one.
// =============================================================================

// -----------------------------------------------------------------------------
// Internal raw row types
// -----------------------------------------------------------------------------

interface KpiBreakdownRow {
  site_id: string;
  date: string;
  health_risk_index: number | null;
  environment_risk_index: number | null;
  feed_risk_index: number | null;
  operational_risk_index: number | null;
}

interface DriverRow {
  site_id: string;
  category: string;
  alert_type: string;
  total: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function statusForScore(score: number): RiskLevel {
  if (score >= 7) return 'Severe';
  if (score >= 4) return 'High';
  if (score >= 2) return 'Moderate';
  return 'Low';
}

// -----------------------------------------------------------------------------
// getFarmRiskScore — composite + 4 category cards
// -----------------------------------------------------------------------------

/**
 * Returns the latest 4 risk indices for a single site OR the average across
 * all visible sites (when siteId is null), plus the alert drivers pushing
 * each score.
 */
export async function getFarmRiskScore(
  siteId: string | null,
): Promise<FarmRiskScore | null> {
  const supabase = createClient();

  // 1. KPI scores (latest row per site)
  let kpiQuery = supabase
    .from('kpi_overview')
    .select(
      'site_id, date, health_risk_index, environment_risk_index, feed_risk_index, operational_risk_index',
    )
    .order('date', { ascending: false });

  if (siteId) {
    kpiQuery = kpiQuery.eq('site_id', siteId).limit(1);
  } else {
    kpiQuery = kpiQuery.limit(50); // overfetch, dedupe to latest-per-site below
  }

  const { data: kpiData, error: kpiErr } = await kpiQuery;
  if (kpiErr) throw new Error(`getFarmRiskScore (kpi): ${kpiErr.message}`);
  if (!kpiData || kpiData.length === 0) return null;

  const rows = kpiData as KpiBreakdownRow[];
  const latestPerSite = new Map<string, KpiBreakdownRow>();
  for (const r of rows) {
    if (!latestPerSite.has(r.site_id)) latestPerSite.set(r.site_id, r);
  }
  const latest = Array.from(latestPerSite.values());

  const avg = (
    key: 'health_risk_index' | 'environment_risk_index' | 'feed_risk_index' | 'operational_risk_index',
  ): number => {
    const vals = latest.map((r) => r[key]).filter((v): v is number => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const healthScore = Number(avg('health_risk_index').toFixed(1));
  const environmentScore = Number(avg('environment_risk_index').toFixed(1));
  const feedScore = Number(avg('feed_risk_index').toFixed(1));
  const operationalScore = Number(avg('operational_risk_index').toFixed(1));
  const overall = Number(((healthScore + environmentScore + feedScore + operationalScore) / 4).toFixed(1));

  // 2. Drivers from kpi_risk_drivers view — aggregate across sites
  let driverQuery = supabase
    .from('kpi_risk_drivers')
    .select('site_id, category, alert_type, total, critical_count, high_count, medium_count, low_count');
  if (siteId) driverQuery = driverQuery.eq('site_id', siteId);

  const { data: driverData, error: dErr } = await driverQuery;
  if (dErr) throw new Error(`getFarmRiskScore (drivers): ${dErr.message}`);

  const driverRows = (driverData ?? []) as DriverRow[];
  const driversByCategory: Record<RiskCategory, RiskDriver[]> = {
    health: [],
    environment: [],
    feed: [],
    operational: [],
  };

  for (const row of driverRows) {
    const cat = row.category as RiskCategory;
    if (!(cat in driversByCategory)) continue;

    const list = driversByCategory[cat];
    const existing = list.find((d) => d.alertType === row.alert_type);
    if (existing) {
      existing.total += Number(row.total);
      existing.critical += Number(row.critical_count);
      existing.high += Number(row.high_count);
      existing.medium += Number(row.medium_count);
      existing.low += Number(row.low_count);
    } else {
      list.push({
        alertType: row.alert_type,
        total: Number(row.total),
        critical: Number(row.critical_count),
        high: Number(row.high_count),
        medium: Number(row.medium_count),
        low: Number(row.low_count),
      });
    }
  }

  // Sort drivers by severity weight
  const severityWeight = (d: RiskDriver) =>
    d.critical * 4 + d.high * 3 + d.medium * 2 + d.low;
  for (const cat of Object.keys(driversByCategory) as RiskCategory[]) {
    driversByCategory[cat].sort((a, b) => severityWeight(b) - severityWeight(a));
  }

  return {
    overall,
    status: statusForScore(overall),
    categories: [
      {
        category: 'health',
        score: healthScore,
        status: statusForScore(healthScore),
        drivers: driversByCategory.health,
      },
      {
        category: 'environment',
        score: environmentScore,
        status: statusForScore(environmentScore),
        drivers: driversByCategory.environment,
      },
      {
        category: 'feed',
        score: feedScore,
        status: statusForScore(feedScore),
        drivers: driversByCategory.feed,
      },
      {
        category: 'operational',
        score: operationalScore,
        status: statusForScore(operationalScore),
        drivers: driversByCategory.operational,
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// getRiskCategorySeries — for the interactive chart
// -----------------------------------------------------------------------------

/**
 * Returns the daily series of a single risk category for the last N days.
 * If siteId is null, averages across all visible sites for each day.
 */
export async function getRiskCategorySeries(
  siteId: string | null,
  category: RiskCategory,
  days = 30,
): Promise<{ date: string; value: number | null }[]> {
  const columnMap: Record<RiskCategory, string> = {
    health: 'health_risk_index',
    environment: 'environment_risk_index',
    feed: 'feed_risk_index',
    operational: 'operational_risk_index',
  };
  const col = columnMap[category];

  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  let query = supabase
    .from('kpi_overview')
    .select(`date, ${col}`)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  if (siteId) query = query.eq('site_id', siteId);

  const { data, error } = await query;
  if (error) throw new Error(`getRiskCategorySeries: ${error.message}`);

  // If no site filter, average per date
  if (!siteId) {
    const byDate = new Map<string, number[]>();
    for (const row of data ?? []) {
      const r = row as unknown as Record<string, unknown>;
      const date = r.date as string;
      const v = Number(r[col]);
      if (!Number.isNaN(v)) {
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date)!.push(v);
      }
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        value: vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null,
      }));
  }

  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const v = r[col];
    return {
      date: r.date as string,
      value: v != null ? Number(Number(v).toFixed(2)) : null,
    };
  });
}

// -----------------------------------------------------------------------------
// getActionItems — recent items from the Claude Opus daily digest
// -----------------------------------------------------------------------------

/**
 * Returns the most recent action items for the Overview tracking section.
 * Sort: in_progress > open > done > skipped, then by updated_at desc.
 */
export async function getActionItems(
  siteId: string | null,
  limit = 8,
): Promise<ActionItemSummary[]> {
  const supabase = createClient();

  let q = supabase
    .from('digest_action_items')
    .select(`
      id,
      site_id,
      date,
      action_text,
      status,
      assigned_to,
      notes,
      completed_at,
      updated_at,
      sites:site_id ( site_name )
    `)
    .order('updated_at', { ascending: false })
    .limit(limit * 2);

  if (siteId) q = q.eq('site_id', siteId);

  const { data, error } = await q;
  if (error) throw new Error(`getActionItems: ${error.message}`);
  if (!data || data.length === 0) return [];

  const priority = (s: string): number => {
    switch (s) {
      case 'in_progress': return 0;
      case 'open': return 1;
      case 'done': return 2;
      case 'skipped': return 3;
      default: return 4;
    }
  };

  // Future: resolve assignee emails via a public user_profiles view.
  // For now we leave assigneeEmail null — the UI shows "Assigned" generically.

  const items: ActionItemSummary[] = data
    .map((d) => {
      const row = d as unknown as Record<string, unknown>;
      const sitesRel = row.sites as { site_name: string } | null;
      return {
        id: row.id as string,
        siteId: row.site_id as string,
        siteName: sitesRel?.site_name ?? 'Unknown site',
        date: row.date as string,
        actionText: row.action_text as string,
        status: row.status as ActionItemSummary['status'],
        assignedTo: (row.assigned_to as string | null) ?? null,
        assigneeEmail: null,
        notes: (row.notes as string | null) ?? null,
        completedAt: (row.completed_at as string | null) ?? null,
        updatedAt: row.updated_at as string,
      };
    })
    .sort((a, b) => {
      const dp = priority(a.status) - priority(b.status);
      if (dp !== 0) return dp;
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, limit);

  return items;
}
