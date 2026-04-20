import Link from 'next/link';
import { Building2, MapPin, Phone, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SiteRow = {
  id: string;
  site_name: string;
  manager_name: string | null;
  manager_phone: string | null;
  location_address: string | null;
  total_animals: number | null;
  active: boolean | null;
  timezone: string | null;
};

type Aggregate = {
  pens: number;
  devices: number;
  openAlerts: number;
  criticalAlerts: number;
};

async function loadData() {
  const sb = createClient();

  const [sitesRes, pensRes, devicesRes, alertsRes] = await Promise.all([
    sb
      .from('sites')
      .select(
        'id, site_name, manager_name, manager_phone, location_address, total_animals, active, timezone'
      )
      .is('deleted_at', null)
      .order('site_name'),
    sb.from('pens').select('site_id, active').is('deleted_at', null),
    sb.from('devices').select('site_id, active'),
    sb.from('alerts').select('site_id, status, severity'),
  ]);

  const sites = (sitesRes.data ?? []) as SiteRow[];
  const agg: Record<string, Aggregate> = {};
  for (const s of sites) {
    agg[s.id] = { pens: 0, devices: 0, openAlerts: 0, criticalAlerts: 0 };
  }
  for (const p of pensRes.data ?? []) {
    const bucket = agg[p.site_id];
    if (bucket && p.active) bucket.pens += 1;
  }
  for (const d of devicesRes.data ?? []) {
    const bucket = agg[d.site_id];
    if (bucket && d.active) bucket.devices += 1;
  }
  for (const a of alertsRes.data ?? []) {
    const bucket = agg[a.site_id];
    if (!bucket) continue;
    if (a.status !== 'Closed') {
      bucket.openAlerts += 1;
      if (a.severity === 'Critical') bucket.criticalAlerts += 1;
    }
  }

  return { sites, agg };
}

export default async function SitesPage() {
  const { sites, agg } = await loadData();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Sites</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {sites.length} {sites.length === 1 ? 'site' : 'sites'} in your organisation.
        </p>
      </header>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            No sites yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            const a = agg[site.id] ?? {
              pens: 0,
              devices: 0,
              openAlerts: 0,
              criticalAlerts: 0,
            };
            return (
              <Link key={site.id} href={`/sites/${site.id}`} className="group block">
                <Card className="transition-colors hover:border-brand-orange/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-brand-orange" />
                        <span className="truncate">{site.site_name}</span>
                      </CardTitle>
                      <ChevronRight className="h-4 w-4 text-ink-muted transition-colors group-hover:text-brand-orange" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">
                        {site.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {site.timezone && (
                        <span className="font-mono text-xs text-ink-muted">
                          {site.timezone}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {site.manager_name && (
                      <p className="text-ink-secondary">
                        Manager:{' '}
                        <span className="text-ink-primary">{site.manager_name}</span>
                      </p>
                    )}
                    {site.manager_phone && (
                      <p className="flex items-center gap-1 text-xs text-ink-muted">
                        <Phone className="h-3.5 w-3.5" /> {site.manager_phone}
                      </p>
                    )}
                    {site.location_address && (
                      <p className="flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{site.location_address}</span>
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-4 gap-2 border-t border-surface-border pt-3 text-center">
                      <Stat label="Animals" value={site.total_animals ?? 0} />
                      <Stat label="Pens" value={a.pens} />
                      <Stat label="Devices" value={a.devices} />
                      <Stat
                        label="Open"
                        value={a.openAlerts}
                        accent={a.criticalAlerts > 0 ? 'critical' : undefined}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'critical';
}) {
  return (
    <div>
      <p
        className={
          'font-display text-lg ' +
          (accent === 'critical' ? 'text-rose-400' : 'text-ink-primary')
        }
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</p>
    </div>
  );
}
