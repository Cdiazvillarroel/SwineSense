import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { getPenDetail, getPensGrid, getPensKpis } from '@/lib/db/pens';
import { PensKpisGrid } from './pens-kpis';
import { PenCard } from './pen-card';
import { PenDrawer } from './pen-drawer';

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
  ventilation_type?: string;
  has_alerts?: string;
  pen?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function PensPage(props: PageProps) {
  const sp = await props.searchParams;

  const [kpis, grid, detail] = await Promise.all([
    getPensKpis(),
    getPensGrid({
      site: sp.site,
      pen_type: sp.pen_type,
      ventilation_type: sp.ventilation_type,
      has_alerts: sp.has_alerts === '1',
    }),
    sp.pen ? getPenDetail(sp.pen) : Promise.resolve(null),
  ]);

  const filterCount = [
    sp.site,
    sp.pen_type,
    sp.ventilation_type,
    sp.has_alerts,
  ].filter(Boolean).length;

  // Distinct ventilation types for filter dropdown
  const ventTypes = Array.from(
    new Set(
      grid.pens
        .map((p) => p.ventilation_type)
        .filter((v): v is string => v !== null && v !== ''),
    ),
  ).sort();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Pens</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {grid.pens.length} of {kpis.fleet.total_pens}{' '}
          {kpis.fleet.total_pens === 1 ? 'pen' : 'pens'} across{' '}
          {grid.sites.length} {grid.sites.length === 1 ? 'site' : 'sites'} ·
          live environmental monitoring + heat stress.
        </p>
      </header>

      {/* KPI cards */}
      <PensKpisGrid data={kpis} />

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <FilterSelect
          name="site"
          label="Site"
          value={sp.site ?? ''}
          options={grid.sites.map((s) => ({
            value: s.id,
            label: s.site_name,
          }))}
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
        {ventTypes.length > 0 && (
          <FilterSelect
            name="ventilation_type"
            label="Ventilation"
            value={sp.ventilation_type ?? ''}
            options={ventTypes.map((v) => ({ value: v, label: v }))}
            allLabel="Any"
          />
        )}
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
            href="/pens"
            className="rounded-btn px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:text-brand-orange"
          >
            Reset ({filterCount})
          </Link>
        )}
      </form>

      {/* Grid */}
      {grid.pens.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            No pens match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grid.pens.map((p) => (
            <PenCard key={p.id} pen={p} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {detail && <PenDrawer detail={detail} />}
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
