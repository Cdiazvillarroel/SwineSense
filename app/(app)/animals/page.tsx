import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  getAnimalDetail,
  getAnimalsKpis,
  getAnimalsList,
  HEALTH_STATUSES,
} from '@/lib/db/animals';
import { AnimalsKpis } from './animals-kpis';
import { AnimalsTable } from './animals-table';
import { AnimalDrawer } from './animal-drawer';

export const dynamic = 'force-dynamic';

const PEN_TYPES = [
  'gestation',
  'farrowing',
  'nursery',
  'grower',
  'finisher',
  'boar',
  'isolation',
] as const;

interface SearchParams {
  site?: string;
  pen_type?: string;
  health?: string;
  has_alerts?: string;
  search?: string;
  animal?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function AnimalsPage(props: PageProps) {
  const sp = await props.searchParams;

  const [kpis, list, detail] = await Promise.all([
    getAnimalsKpis(),
    getAnimalsList({
      site: sp.site,
      pen_type: sp.pen_type,
      health: sp.health,
      has_alerts: sp.has_alerts === '1',
      search: sp.search,
      page: parseInt(sp.page ?? '1', 10) || 1,
    }),
    sp.animal ? getAnimalDetail(sp.animal) : Promise.resolve(null),
  ]);

  const filterCount =
    [sp.site, sp.pen_type, sp.health, sp.has_alerts, sp.search].filter(
      Boolean,
    ).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Animals</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Group view across {kpis.herd.by_pen_type.length} pen types and{' '}
          {list.sites.length} {list.sites.length === 1 ? 'site' : 'sites'}.
        </p>
      </header>

      {/* KPI cards */}
      <AnimalsKpis data={kpis} />

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <FilterSelect
          name="site"
          label="Site"
          value={sp.site ?? ''}
          options={list.sites.map((s) => ({ value: s.id, label: s.site_name }))}
          allLabel="All sites"
        />
        <FilterSelect
          name="pen_type"
          label="Pen type"
          value={sp.pen_type ?? ''}
          options={(PEN_TYPES as readonly string[]).map((t) => ({
            value: t,
            label: t,
          }))}
          allLabel="All types"
        />
        <FilterSelect
          name="health"
          label="Health"
          value={sp.health ?? ''}
          options={(HEALTH_STATUSES as readonly string[]).map((h) => ({
            value: h,
            label: h,
          }))}
          allLabel="All"
        />
        <div>
          <label
            htmlFor="search"
            className="block text-xs uppercase tracking-wider text-ink-muted"
          >
            Tag #
          </label>
          <input
            id="search"
            name="search"
            type="text"
            defaultValue={sp.search ?? ''}
            placeholder="Search…"
            className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm placeholder:text-ink-muted"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-sm text-ink-secondary">
          <input
            type="checkbox"
            name="has_alerts"
            value="1"
            defaultChecked={sp.has_alerts === '1'}
            className="h-4 w-4 accent-brand-orange"
          />
          With open alerts
        </label>
        <button
          type="submit"
          className="rounded-btn border border-surface-border px-3 py-1.5 text-sm transition-colors hover:border-brand-orange/40"
        >
          Apply
        </button>
        {filterCount > 0 && (
          <Link
            href="/animals"
            className="rounded-btn px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:text-brand-orange"
          >
            Reset ({filterCount})
          </Link>
        )}
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <AnimalsTable rows={list.rows} />
        </CardContent>
      </Card>

      {/* Pagination */}
      {list.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-ink-muted">
            Page {list.page} of {list.totalPages} · Showing{' '}
            {Math.min(list.pageSize, list.rows.length)} of {list.total}
          </p>
          <div className="flex gap-2">
            <PageLink
              page={list.page - 1}
              disabled={list.page <= 1}
              label="Previous"
              searchParams={sp}
            />
            <PageLink
              page={list.page + 1}
              disabled={list.page >= list.totalPages}
              label="Next"
              searchParams={sp}
            />
          </div>
        </div>
      )}

      {/* Drawer */}
      {detail && <AnimalDrawer detail={detail} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local helpers (server-side rendered filters)
// ---------------------------------------------------------------------------

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

function PageLink({
  page,
  disabled,
  label,
  searchParams,
}: {
  page: number;
  disabled: boolean;
  label: string;
  searchParams: SearchParams;
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
  if (searchParams.pen_type) sp.set('pen_type', searchParams.pen_type);
  if (searchParams.health) sp.set('health', searchParams.health);
  if (searchParams.has_alerts) sp.set('has_alerts', searchParams.has_alerts);
  if (searchParams.search) sp.set('search', searchParams.search);
  sp.set('page', String(page));
  return (
    <Link
      href={`/animals?${sp.toString()}`}
      className="rounded-btn border border-surface-border px-3 py-1.5 transition-colors hover:border-brand-orange/40"
    >
      {label}
    </Link>
  );
}
