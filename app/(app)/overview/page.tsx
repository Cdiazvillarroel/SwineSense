import { PawPrint, Bell, Activity, AlertOctagon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { TrendChart } from '@/components/charts/TrendChart';
import { AlertDistributionChart } from '@/components/charts/AlertDistributionChart';
import { AlertTable } from '@/components/alerts/AlertTable';
import { kpiRepo, alertsRepo } from '@/lib/db';
import { formatNumber } from '@/lib/utils/format';

export const metadata = { title: 'Overview' };

/**
 * Executive Overview.
 *
 * Server Component. Fetches everything in parallel on the server, renders
 * static HTML sent to the browser. Client Components (charts) hydrate
 * with the already-resolved data.
 *
 * If no `?site=` is present, falls back to an aggregated view across all
 * sites the user can see.
 */

interface PageProps {
  searchParams: { site?: string };
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const siteId = searchParams.site ?? null;

  // Parallel loads — Server Component render is blocking but each query
  // runs concurrently.
  const [kpi, severityCounts, recentAlerts, healthSeries] = await Promise.all([
    siteId ? kpiRepo.getLatestKpi(siteId) : kpiRepo.getAggregatedKpi(),
    alertsRepo.countOpenBySeverity(siteId ?? undefined),
    alertsRepo.listAlerts(
      { siteIds: siteId ? [siteId] : undefined, statuses: ['Open', 'In Progress'] },
      1,
      8,
    ),
    siteId ? kpiRepo.getKpiSeries(siteId, 'healthRiskIndex', 30) : Promise.resolve([]),
  ]);

  const healthTone: 'positive' | 'warning' | 'critical' | 'neutral' =
    (kpi?.healthRiskIndex ?? 0) >= 7
      ? 'critical'
      : (kpi?.healthRiskIndex ?? 0) >= 4
        ? 'warning'
        : 'positive';

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

      {/* KPI row */}
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
        />
        <KpiCard
          label="Health risk index"
          value={formatNumber(kpi?.healthRiskIndex ?? 0, 1)}
          unit="/10"
          tone={healthTone}
          icon={<Activity className="h-4 w-4" />}
        />
      </KpiGrid>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Health risk — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {healthSeries.length > 0 ? (
              <TrendChart
                series={[{ name: 'Health risk index', data: healthSeries }]}
                unit="/10"
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-ink-muted">
                  Select a site to see the health risk trend.
                </p>
              </div>
            )}
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

      {/* Recent alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active alerts requiring attention</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertTable alerts={recentAlerts.rows} />
        </CardContent>
      </Card>
    </div>
  );
}
