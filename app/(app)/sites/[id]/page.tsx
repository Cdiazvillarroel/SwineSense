import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Clock,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/alerts/SeverityBadge';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

async function load(siteId: string) {
  const sb = createClient();

  const [siteRes, pensRes, kpiRes, alertsRes, devicesRes] = await Promise.all([
    sb.from('sites').select('*').eq('id', siteId).is('deleted_at', null).maybeSingle(),
    sb
      .from('pens')
      .select('id, pen_name, pen_type, capacity, current_animals, active, notes')
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .order('pen_name'),
    sb
      .from('kpi_overview')
      .select(
        'date, open_alerts, critical_alerts, animals_at_risk, overall_status, lowest_silo_days, devices_offline, devices_low_battery'
      )
      .eq('site_id', siteId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('alerts')
      .select('id, alert_type, severity, status, timestamp, short_message, trigger_reason')
      .eq('site_id', siteId)
      .order('timestamp', { ascending: false })
      .limit(5),
    sb.from('devices').select('signal_status, active').eq('site_id', siteId),
  ]);

  return {
    site: siteRes.data,
    pens: pensRes.data ?? [],
    kpi: kpiRes.data,
    alerts: alertsRes.data ?? [],
    devices: devicesRes.data ?? [],
  };
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { site, pens, kpi, alerts, devices } = await load(params.id);
  if (!site) notFound();

  const activeDevices = devices.filter((d) => d.active).length;
  const onlineDevices = devices.filter(
    (d) => d.active && d.signal_status === 'online'
  ).length;
  const offlineDevices = devices.filter(
    (d) => d.active && d.signal_status === 'offline'
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/sites"
        className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-orange"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sites
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-orange" />
            <h1 className="font-display text-section">{site.site_name}</h1>
            <Badge variant="neutral">{site.active ? 'Active' : 'Inactive'}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-secondary">
            {site.manager_name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" /> {site.manager_name}
              </span>
            )}
            {site.manager_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" /> {site.manager_phone}
              </span>
            )}
            {site.location_address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {site.location_address}
              </span>
            )}
            {site.timezone && (
              <span className="flex items-center gap-1 font-mono text-xs">
                <Clock className="h-4 w-4" /> {site.timezone}
              </span>
            )}
          </div>
        </div>
      </header>

      {kpi && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Open alerts"
            value={kpi.open_alerts ?? 0}
            accent={
              (kpi.open_alerts ?? 0) > 0 ? 'warning' : undefined
            }
          />
          <KpiCard
            label="Critical"
            value={kpi.critical_alerts ?? 0}
            accent={(kpi.critical_alerts ?? 0) > 0 ? 'critical' : undefined}
          />
          <KpiCard label="Animals at risk" value={kpi.animals_at_risk ?? 0} />
          <KpiCard label="Overall status" text={kpi.overall_status ?? '—'} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pens ({pens.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pens.length === 0 ? (
                <p className="px-6 py-6 text-sm text-ink-muted">No pens found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 text-right font-medium">Capacity</th>
                      <th className="px-4 py-2 text-right font-medium">Current</th>
                      <th className="px-4 py-2 text-right font-medium">Fill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pens.map((p) => {
                      const fill =
                        p.capacity && p.capacity > 0
                          ? Math.round(((p.current_animals ?? 0) / p.capacity) * 100)
                          : null;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-surface-border last:border-0"
                        >
                          <td className="px-4 py-2 text-ink-primary">{p.pen_name}</td>
                          <td className="px-4 py-2">
                            <Badge variant="neutral">{p.pen_type}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right text-ink-secondary">
                            {p.capacity ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-ink-secondary">
                            {p.current_animals ?? 0}
                          </td>
                          <td className="px-4 py-2 text-right text-ink-muted tabular-nums">
                            {fill !== null ? `${fill}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Devices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Active" value={activeDevices} />
              <Row label="Online" value={onlineDevices} />
              <Row
                label="Offline"
                value={offlineDevices}
                accent={offlineDevices > 0 ? 'warning' : undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {alerts.length === 0 ? (
                <p className="text-ink-muted">No alerts.</p>
              ) : (
                alerts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/alerts/${a.id}`}
                    className="block rounded-btn border border-surface-border px-3 py-2 transition-colors hover:border-brand-orange/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink-primary">
                        {a.short_message ?? a.trigger_reason ?? a.alert_type}
                      </span>
                      <SeverityBadge severity={a.severity} />
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatRelative(a.timestamp)}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {site.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink-secondary">
                {site.notes}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  text,
  accent,
}: {
  label: string;
  value?: number;
  text?: string;
  accent?: 'critical' | 'warning';
}) {
  const color =
    accent === 'critical'
      ? 'text-rose-400'
      : accent === 'warning'
        ? 'text-amber-400'
        : 'text-ink-primary';
  return (
    <Card>
      <CardContent className="pt-6">
        <p className={'font-display text-2xl ' + color}>{text ?? value ?? 0}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-ink-muted">{label}</p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'warning';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-secondary">{label}</span>
      <span
        className={
          'font-display text-base ' +
          (accent === 'warning' ? 'text-amber-400' : 'text-ink-primary')
        }
      >
        {value}
      </span>
    </div>
  );
}
