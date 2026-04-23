import { PawPrint, Bell, AlertOctagon, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { AlertDistributionChart } from '@/components/charts/AlertDistributionChart';
import { AlertTable } from '@/components/alerts/AlertTable';
import { RiskBreakdown } from '@/components/overview/RiskBreakdown';
import { ActionItems } from '@/components/overview/ActionItems';
import { kpiRepo, alertsRepo } from '@/lib/db';
import type { RiskCategory } from '@/lib/db/kpi';
import { formatNumber } from '@/lib/utils/format';

export const metadata = { title: 'Overview' };

/**
 * Executive Overview.
 *
 * Server Component. Fetches everything in parallel on the server, renders
 * static HTML sent to the browser. Client Components (charts, RiskBreakdown)
 * hydrate with the already-resolved data.
 *
 * Sections (top to bottom):
 *   1. Top KPI cards (animals monitored, open alerts, animals at risk,
 *      Farm Risk overall status)
 *   2. Risk Breakdown (Farm Risk Score + 4 interactive category cards
 *      sharing one chart that swaps based on selection)
 *   3. Action items (from Claude Opus's daily digest)
 *   4. Active alerts table + Alert distribution donut
 *
 * If no `?site=` is present, falls back to an aggregated view across all
 * sites the user can see.
 */

interface SearchParams {
  site?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function OverviewPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const siteId = searchParams.site ?? null;

  // Parallel loads — Server Component render is blocking but each query
  // runs concurrently.
  const [
    kpi,
    severityCounts,
    recentAlerts,
    farmRiskScore,
    healthSeries,
    environmentSeries,
    feedSeries,
    operationalSeries,
    actionItems,
  ] = await Promise.all([
    siteId ? kpiRepo.getLatestKpi(siteId) : kpiRepo.getAggregatedKpi(),
    alertsRepo.countOpenBySeverity(siteId ?? undefined),
    alertsRepo.listAlerts(
      { siteIds: siteId ? [siteId] : undefined, statuses: ['Open', 'In Progress'] },
      1,
      8,
    ),
    kpiRepo.getFarmRiskScore(siteId),
    kpiRepo.getRiskCategorySeries(siteId, 'health', 30),
    kpiRepo.getRiskCategorySeries(siteId, 'environment', 30),
    kpiRepo.getRiskCategorySeries(siteId, 'feed', 30),
    kpiRepo.getRiskCategorySeries(siteId, 'operational', 30),
    kpiRepo.getActionItems(siteId, 6),
  ]);

  const seriesByCategory: Record<RiskCategory, { date: string; value: number | null }[]> = {
    health: healthSeries,
    environment: environmentSeries,
    feed: feedSeries,
    operational: operationalSeries,
  };

  // Top-card "Farm risk status" tone (driven by composite Farm Risk Score)
  const overallTone: 'positive' | 'warning' | 'critical' | 'neutral' = (() => {
    const s = farmRiskScore?.status;
    if (s === 'Severe' || s === 'High') return 'critical';
    if (s === 'Moderate') return 'warning';
    if (s === 'Low') return 'positive';
    return 'neutral';
  })();

  return (
    <div className="space-y-8">
      <header>
        <p className="label-badge">Executive Overview</p>
        <h1 className="mt-1 font-display text-section">
          {siteId ? 'Site dashboard' : 'All sites at a glance'}
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {kpi
            ? `Last update ${kpi.date}. ${kpi.pensMonitored} pens · ${formatNumber(kpi.animalsMonitored, 0)} animals monitored.`
            : 'No KPI data available yet. The daily aggregator will populate this view.'}
        </p>
      </header>

      {/* ============================================================ */}
      {/* 1. Top KPI row                                                */}
      {/* ============================================================ */}
      <KpiGrid>
        <KpiCard
          label="Animals monitored"
          value={formatNumber(kpi?.animalsMonitored ?? 0, 0)}
          icon={<PawPrint className="h-4 w-4" />}
          hint={`${kpi?.pensMonitored ?? 0} pens`}
        />
        <KpiCard
          label="Open alerts"
          value={kpi?.openAlerts ?? 0}
          tone={(kpi?.criticalAlerts ?? 0) > 0 ? 'critical' : 'neutral'}
          icon={<Bell className="h-4 w-4" />}
          hint={`${kpi?.criticalAlerts ?? 0} critical · ${kpi?.highAlerts ?? 0} high`}
        />
        <KpiCard
          label="Animals at risk"
          value={kpi?.animalsAtRisk ?? 0}
          tone={(kpi?.animalsAtRisk ?? 0) > 10 ? 'warning' : 'neutral'}
          icon={<AlertOctagon className="h-4 w-4" />}
          hint={`out of ${formatNumber(kpi?.animalsMonitored ?? 0, 0)}`}
        />
        <KpiCard
          label="Farm risk status"
          value={farmRiskScore?.status ?? '—'}
          tone={overallTone}
          icon={<Gauge className="h-4 w-4" />}
          hint={
            farmRiskScore
              ? `${formatNumber(farmRiskScore.overall, 1)}/10 composite`
              : '—'
          }
        />
      </KpiGrid>

      {/* ============================================================ */}
      {/* 2. Risk Breakdown — composite + 4 interactive cards + chart   */}
      {/* ============================================================ */}
      {farmRiskScore && (
        <RiskBreakdown data={farmRiskScore} seriesByCategory={seriesByCategory} />
      )}

      {/* ============================================================ */}
      {/* 3. Action items                                               */}
      {/* ============================================================ */}
      <ActionItems items={actionItems} />

      {/* ============================================================ */}
      {/* 4. Alert distribution + Active alerts                         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active alerts requiring attention</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTable alerts={recentAlerts.rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDistributionChart counts={severityCounts} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
