import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { RiskLevel } from '@/lib/types/domain';

/**
 * Risk breakdown repository.
 *
 * Powers the new "Farm Risk Score" section on the Overview, which separates
 * the single composite risk score into 4 categories (health / environment /
 * feed / operational) and exposes the alert drivers behind each one.
 *
 * Also returns the daily action items derived from Claude Opus's morning
 * digest (digest_action_items table) for the in-page tracking section.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RiskCategory = 'health' | 'environment' | 'feed' | 'operational';

export interface RiskDriver {
  alertType: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RiskCategoryBreakdown {
  category: RiskCategory;
  score: number;          // 0-10
  status: RiskLevel;
  drivers: RiskDriver[];
}

export interface FarmRiskScore {
  overall: number;        // 0-10, average of the 4 categories
  status: RiskLevel;
  categories: RiskCategoryBreakdown[];
}

export interface ActionItemSummary {
  id: string;
  siteId: string;
  siteName: string;
  date: string;           // YYYY-MM-DD
  actionText: string;
  status: 'open' | 'in_progress' | 'done' | 'skipped';
  assignedTo: string | null;
  assigneeEmail: string | null;
  notes: string | null;
  completedAt: string | null;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Status mapper (single source of truth)
// -----------------------------------------------------------------------------

function statusForScore(score: number): RiskLevel {
  if (score >= 7) return 'Severe';
  if (score >= 4) return 'High';
  if (score >= 2) return 'Moderate';
  return 'Low';
}

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
    kpiQuery = kpiQuery.limit(50); // overfetch then dedupe to latest-per-site
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

  // Resolve assignee emails best-effort via users_organizations (we don't have
  // a public view of auth.users). Future improvement: a `user_profiles` view.
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

// -----------------------------------------------------------------------------
// Static category metadata — re-exported for the client component
// -----------------------------------------------------------------------------

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  health: 'Health',
  environment: 'Environment',
  feed: 'Feed',
  operational: 'Operational',
};

export const RISK_CATEGORY_DESCRIPTIONS: Record<RiskCategory, string> = {
  health: 'Animal welfare & disease risk',
  environment: 'Climate, ventilation & THI',
  feed: 'Feed intake & silo levels',
  operational: 'Devices & infrastructure',
};

/**
 * Human-readable labels for each alert_type, keyed by category.
 * If a type isn't here, the UI falls back to the raw key with underscores
 * replaced by spaces.
 */
export const DRIVER_LABELS: Record<string, string> = {
  fever_risk: 'Fever risk',
  combined_risk: 'Combined health risk',
  environment: 'Climate alerts',
  heat_stress_severe: 'Severe heat stress',
  heat_stress_moderate: 'Heat stress',
  heat_stress_mild: 'Mild heat stress',
  feed_drop: 'Feed intake drop',
  silo: 'Silo level low',
  low_growth: 'Low growth',
  device: 'Device fault',
};

// Severity tag character mapping is inlined in the UI component (just first letter)
