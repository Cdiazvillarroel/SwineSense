import Link from 'next/link';
import {
  getDeviceDetail,
  getDevicesKpis,
  getDevicesList,
} from '@/lib/db/devices';
import { DevicesKpisGrid } from './devices-kpis';
import { DevicesTable } from './devices-table';
import { DeviceDrawer } from './device-drawer';

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

interface SearchParams {
  site?: string;
  pen?: string;
  device_type?: string;
  signal_status?: string;
  low_battery?: string;
  search?: string;
  page?: string;
  device?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function DevicesPage(props: PageProps) {
  const sp = await props.searchParams;

  const page = sp.page ? parseInt(sp.page, 10) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const [kpis, listResult, detail] = await Promise.all([
    getDevicesKpis(),
    getDevicesList(
      {
        site: sp.site,
        pen: sp.pen,
        device_type: sp.device_type,
        signal_status: sp.signal_status,
        low_battery: sp.low_battery === '1',
        search: sp.search,
      },
      safePage,
    ),
    sp.device ? getDeviceDetail(sp.device) : Promise.resolve(null),
  ]);

  const filterCount = [
    sp.site,
    sp.pen,
    sp.device_type,
    sp.signal_status,
    sp.low_battery,
    sp.search,
  ].filter(Boolean).length;

  // Pens narrowed to selected site
  const pensInScope = sp.site
    ? listResult.pens.filter((p) => p.site_id === sp.site)
    : listResult.pens;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Devices</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {kpis.fleet.total_active}{' '}
          {kpis.fleet.total_active === 1 ? 'device' : 'devices'} across{' '}
          {kpis.by_site.length}{' '}
          {kpis.by_site.length === 1 ? 'site' : 'sites'} · battery, signal &
          telemetry health.
        </p>
      </header>

      {/* KPI cards */}
      <DevicesKpisGrid data={kpis} />

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <FilterSelect
          name="site"
          label="Site"
          value={sp.site ?? ''}
          options={listResult.sites.map((s) => ({
            value: s.id,
            label: s.site_name,
          }))}
          allLabel="All sites"
        />
        <FilterSelect
          name="pen"
          label="Pen"
          value={sp.pen ?? ''}
          options={pensInScope.map((p) => ({
            value: p.id,
            label: p.pen_name,
          }))}
          allLabel="Any pen"
        />
        <FilterSelect
          name="device_type"
          label="Type"
          value={sp.device_type ?? ''}
          options={(DEVICE_TYPES as readonly string[]).map((t) => ({
            value: t,
            label: t.replace('_', ' '),
          }))}
          allLabel="Any type"
        />
        <FilterSelect
          name="signal_status"
          label="Signal"
          value={sp.signal_status ?? ''}
          options={(SIGNAL_STATUSES as readonly string[]).map((s) => ({
            value: s,
            label: s,
          }))}
          allLabel="Any signal"
        />
        <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-sm text-ink-secondary">
          <input
            type="checkbox"
            name="low_battery"
            value="1"
            defaultChecked={sp.low_battery === '1'}
            className="h-4 w-4 accent-brand-orange"
          />
          Battery &lt;30%
        </label>
        <div>
          <label
            htmlFor="search"
            className="block text-xs uppercase tracking-wider text-ink-muted"
          >
            Search
          </label>
          <input
            id="search"
            name="search"
            type="text"
            placeholder="serial / model"
            defaultValue={sp.search ?? ''}
            className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm placeholder:text-ink-muted"
          />
        </div>
        <button
          type="submit"
          className="rounded-btn border border-surface-border px-3 py-1.5 text-sm transition-colors hover:border-brand-orange/40"
        >
          Apply
        </button>
        {filterCount > 0 && (
          <Link
            href="/devices"
            className="rounded-btn px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:text-brand-orange"
          >
            Reset ({filterCount})
          </Link>
        )}
      </form>

      {/* Note about last_seen during synthetic data phase */}
      <div className="rounded-md border border-surface-border bg-white/[0.02] p-3 text-xs text-ink-muted">
        <span className="text-ink-secondary">Heads up:</span>{' '}
        <code className="font-mono">last_seen</code> reflects each device's
        last reported timestamp. Synthetic telemetry doesn't yet update this
        field, so most devices will appear stale during development. Real
        on-device pings will populate this in production.
      </div>

      {/* Table */}
      <DevicesTable result={listResult} />

      {/* Drawer */}
      {detail && <DeviceDrawer detail={detail} />}
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs uppercase tracking-wider text-ink-muted"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm capitalize"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="capitalize">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
