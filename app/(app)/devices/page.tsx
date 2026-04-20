import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const DEVICE_TYPES = [
  'ear_tag',
  'env_probe',
  'silo_sensor',
  'water_flow',
  'camera',
  'gateway',
] as const;

const SIGNAL_STATUSES = ['online', 'degraded', 'offline'] as const;

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: {
    site?: string;
    type?: string;
    signal?: string;
    page?: string;
  };
}

async function load(params: PageProps['searchParams']) {
  const sb = createClient();

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sitesRes = await sb
    .from('sites')
    .select('id, site_name')
    .is('deleted_at', null)
    .order('site_name');
  const sites = sitesRes.data ?? [];

  let q = sb
    .from('devices')
    .select(
      'id, serial_number, device_type, model, battery_status, signal_status, last_seen, active, site_id, pen_id',
      { count: 'exact' }
    )
    .order('last_seen', { ascending: false, nullsFirst: false });

  if (params.site && sites.some((s) => s.id === params.site)) {
    q = q.eq('site_id', params.site);
  }
  if (params.type && (DEVICE_TYPES as readonly string[]).includes(params.type)) {
    q = q.eq('device_type', params.type);
  }
  if (
    params.signal &&
    (SIGNAL_STATUSES as readonly string[]).includes(params.signal)
  ) {
    q = q.eq('signal_status', params.signal);
  }

  const devicesRes = await q.range(from, to);
  const devices = devicesRes.data ?? [];
  const total = devicesRes.count ?? 0;

  const penIds = Array.from(
    new Set(devices.map((d) => d.pen_id).filter((v): v is string => !!v))
  );
  const pensRes = penIds.length
    ? await sb.from('pens').select('id, pen_name').in('id', penIds)
    : { data: [] as { id: string; pen_name: string }[] };

  const pensMap = new Map<string, { id: string; pen_name: string }>(
    (pensRes.data ?? []).map((p) => [p.id, p])
  );
  const sitesMap = new Map<string, { id: string; site_name: string }>(
    sites.map((s) => [s.id, s])
  );

  return {
    sites,
    devices,
    pensMap,
    sitesMap,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export default async function DevicesPage({ searchParams }: PageProps) {
  const { sites, devices, pensMap, sitesMap, total, page, pageSize, totalPages } =
    await load(searchParams);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Devices</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {total} {total === 1 ? 'device' : 'devices'} reporting telemetry.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <FilterSelect id="site" label="Site" defaultValue={searchParams.site}>
          <option value="">All sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.site_name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect id="type" label="Type" defaultValue={searchParams.type}>
          <option value="">All types</option>
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect id="signal" label="Signal" defaultValue={searchParams.signal}>
          <option value="">All</option>
          {SIGNAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FilterSelect>

        <button
          type="submit"
          className="rounded-btn border border-surface-border px-3 py-1.5 text-sm transition-colors hover:border-brand-orange/40"
        >
          Apply
        </button>

        {(searchParams.site || searchParams.type || searchParams.signal) && (
          <Link
            href="/devices"
            className="rounded-btn px-3 py-1.5 text-sm text-ink-secondary hover:text-brand-orange"
          >
            Reset
          </Link>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          {devices.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-muted">
              No devices match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-2 font-medium">Serial</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Model</th>
                    <th className="px-4 py-2 font-medium">Site / Pen</th>
                    <th className="px-4 py-2 font-medium">Battery</th>
                    <th className="px-4 py-2 font-medium">Signal</th>
                    <th className="px-4 py-2 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => {
                    const pen = d.pen_id ? pensMap.get(d.pen_id) : undefined;
                    const site = d.site_id ? sitesMap.get(d.site_id) : undefined;
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-surface-border last:border-0"
                      >
                        <td className="px-4 py-2 font-mono text-xs text-ink-primary">
                          {d.serial_number}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="neutral">{d.device_type}</Badge>
                        </td>
                        <td className="px-4 py-2 text-ink-secondary">
                          {d.model ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-ink-secondary">
                          {site?.site_name ?? '—'}
                          {pen && (
                            <span className="text-ink-muted"> · {pen.pen_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Battery level={d.battery_status} />
                        </td>
                        <td className="px-4 py-2">
                          <SignalBadge status={d.signal_status} />
                        </td>
                        <td className="px-4 py-2 text-ink-muted">
                          {d.last_seen ? formatRelative(d.last_seen) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-ink-muted">
            Page {page} of {totalPages} · Showing {Math.min(pageSize, devices.length)}{' '}
            of {total}
          </p>
          <div className="flex gap-2">
            <PageLink
              page={page - 1}
              disabled={page <= 1}
              label="Previous"
              searchParams={searchParams}
            />
            <PageLink
              page={page + 1}
              disabled={page >= totalPages}
              label="Next"
              searchParams={searchParams}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  defaultValue,
  children,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs uppercase tracking-wider text-ink-muted"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue ?? ''}
        className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm"
      >
        {children}
      </select>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  label,
  searchParams,
}: {
  page: number;
  disabled: boolean;
  label: string;
  searchParams: PageProps['searchParams'];
}) {
  if (disabled) {
    return (
      <span className="rounded-btn border border-surface-border px-3 py-1.5 opacity-50">
        {label}
      </span>
    );
  }
  const sp = new URLSearchParams();
  if (searchParams.site) sp.set('site', searchParams.site);
  if (searchParams.type) sp.set('type', searchParams.type);
  if (searchParams.signal) sp.set('signal', searchParams.signal);
  sp.set('page', String(page));
  return (
    <Link
      href={`/devices?${sp.toString()}`}
      className="rounded-btn border border-surface-border px-3 py-1.5 transition-colors hover:border-brand-orange/40"
    >
      {label}
    </Link>
  );
}

function Battery({ level }: { level: number | null }) {
  if (level === null || level === undefined) {
    return <span className="text-ink-muted">—</span>;
  }
  const color =
    level < 20 ? 'bg-rose-400' : level < 50 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-border">
        <div className={'h-full ' + color} style={{ width: `${level}%` }} />
      </div>
      <span className="text-xs tabular-nums text-ink-muted">{level}%</span>
    </div>
  );
}

function SignalBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    online: 'border-emerald-400/40 text-emerald-400',
    degraded: 'border-amber-400/40 text-amber-400',
    offline: 'border-rose-400/40 text-rose-400',
  };
  const cls = map[status ?? ''] ?? 'border-surface-border text-ink-secondary';
  return (
    <span className={'inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' + cls}>
      {status ?? '—'}
    </span>
  );
}
