import {
  getSiteDetail,
  getSitesGrid,
  getSitesKpis,
} from '@/lib/db/sites';
import { fetchSiteWeather } from '@/lib/weather';
import { Card, CardContent } from '@/components/ui/card';
import { SitesKpisGrid } from './sites-kpis';
import { SiteCard } from './site-card';
import { SiteDrawer } from './site-drawer';

export const dynamic = 'force-dynamic';

interface SearchParams {
  site?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function SitesPage(props: PageProps) {
  const sp = await props.searchParams;

  const [kpis, sites, detail] = await Promise.all([
    getSitesKpis(),
    getSitesGrid(),
    sp.site ? getSiteDetail(sp.site) : Promise.resolve(null),
  ]);

  // If a site is open, fetch its weather in parallel (only when needed)
  const weather =
    detail && detail.latitude !== null && detail.longitude !== null
      ? await fetchSiteWeather(
          detail.latitude,
          detail.longitude,
          detail.timezone,
        )
      : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Sites</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Fleet overview across {sites.length}{' '}
          {sites.length === 1 ? 'site' : 'sites'} · live weather + heat stress
          monitoring.
        </p>
      </header>

      <SitesKpisGrid data={kpis} />

      {sites.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            No sites yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <SiteCard key={s.id} site={s} />
          ))}
        </div>
      )}

      {detail && <SiteDrawer detail={detail} weather={weather} />}
    </div>
  );
}
