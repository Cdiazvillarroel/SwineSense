import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const HEALTH_STATUSES = [
  'healthy',
  'monitoring',
  'sick',
  'recovering',
  'deceased',
] as const;
type HealthStatus = (typeof HEALTH_STATUSES)[number];

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: {
    site?: string;
    health?: string;
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
    .from('animals')
    .select(
      'id, tag_number, sex, birth_date, weight_kg, breed, health_status, active, pen_id, site_id',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('tag_number');

  if (params.site && sites.some((s) => s.id === params.site)) {
    q = q.eq('site_id', params.site);
  }
  if (
    params.health &&
    (HEALTH_STATUSES as readonly string[]).includes(params.health)
  ) {
    q = q.eq('health_status', params.health);
  }

  const animalsRes = await q.range(from, to);
  const animals = animalsRes.data ?? [];
  const total = animalsRes.count ?? 0;

  const penIds = Array.from(
    new Set(animals.map((a) => a.pen_id).filter((v): v is string => !!v))
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
    animals,
    pensMap,
    sitesMap,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export default async function AnimalsPage({ searchParams }: PageProps) {
  const { sites, animals, pensMap, sitesMap, total, page, pageSize, totalPages } =
    await load(searchParams);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Animals</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {total} {total === 1 ? 'animal' : 'animals'} across your sites.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div>
          <label
            htmlFor="site"
            className="block text-xs uppercase tracking-wider text-ink-muted"
          >
            Site
          </label>
          <select
            id="site"
            name="site"
            defaultValue={searchParams.site ?? ''}
            className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="health"
            className="block text-xs uppercase tracking-wider text-ink-muted"
          >
            Health
          </label>
          <select
            id="health"
            name="health"
            defaultValue={searchParams.health ?? ''}
            className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {HEALTH_STATUSES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-btn border border-surface-border px-3 py-1.5 text-sm transition-colors hover:border-brand-orange/40"
        >
          Apply filters
        </button>
        {(searchParams.site || searchParams.health) && (
          <Link
            href="/animals"
            className="rounded-btn px-3 py-1.5 text-sm text-ink-secondary hover:text-brand-orange"
          >
            Reset
          </Link>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          {animals.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-muted">
              No animals match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-2 font-medium">Tag</th>
                    <th className="px-4 py-2 font-medium">Sex</th>
                    <th className="px-4 py-2 font-medium">Breed</th>
                    <th className="px-4 py-2 font-medium">Pen</th>
                    <th className="px-4 py-2 font-medium">Site</th>
                    <th className="px-4 py-2 text-right font-medium">Weight (kg)</th>
                    <th className="px-4 py-2 font-medium">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {animals.map((a) => {
                    const pen = a.pen_id ? pensMap.get(a.pen_id) : undefined;
                    const site = a.site_id ? sitesMap.get(a.site_id) : undefined;
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-surface-border last:border-0"
                      >
                        <td className="px-4 py-2 font-mono text-ink-primary">
                          {a.tag_number}
                        </td>
                        <td className="px-4 py-2 text-ink-secondary">
                          {a.sex ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-ink-secondary">
                          {a.breed ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-ink-secondary">
                          {pen?.pen_name ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-ink-secondary">
                          {site?.site_name ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-ink-secondary tabular-nums">
                          {a.weight_kg ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <HealthBadge status={a.health_status} />
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
            Page {page} of {totalPages} · Showing {Math.min(pageSize, animals.length)}{' '}
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
  if (searchParams.health) sp.set('health', searchParams.health);
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

function HealthBadge({ status }: { status: HealthStatus | string | null }) {
  const map: Record<string, string> = {
    healthy: 'border-emerald-400/40 text-emerald-400',
    monitoring: 'border-amber-400/40 text-amber-400',
    sick: 'border-rose-400/40 text-rose-400',
    recovering: 'border-sky-400/40 text-sky-400',
    deceased: 'border-ink-muted/40 text-ink-muted',
  };
  const cls = map[status ?? ''] ?? 'border-surface-border text-ink-secondary';
  return (
    <span className={'inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' + cls}>
      {status ?? '—'}
    </span>
  );
}
