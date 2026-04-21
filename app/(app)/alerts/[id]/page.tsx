import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AlertFilters } from '@/components/alerts/AlertFilters';
import { AlertTable } from '@/components/alerts/AlertTable';
import { alertsRepo } from '@/lib/db';
import type { AlertSeverity, AlertStatus } from '@/lib/types/domain';

export const metadata = { title: 'Alerts' };

interface SearchParams {
  site?: string;
  severity?: string;
  status?: string;
  page?: string;
  search?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const SEVERITIES = new Set<AlertSeverity>(['Low', 'Medium', 'High', 'Critical']);
const STATUSES = new Set<AlertStatus>(['Open', 'In Progress', 'Closed', 'Snoozed']);

function parseCsv<T extends string>(
  value: string | undefined,
  allowed: Set<T>,
): T[] | undefined {
  if (!value) return undefined;
  const parsed = value.split(',').filter((v): v is T => allowed.has(v as T));
  return parsed.length ? parsed : undefined;
}

export default async function AlertsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const result = await alertsRepo.listAlerts(
    {
      siteIds: searchParams.site ? [searchParams.site] : undefined,
      severities: parseCsv<AlertSeverity>(searchParams.severity, SEVERITIES),
      statuses: parseCsv<AlertStatus>(searchParams.status, STATUSES),
      search: searchParams.search,
    },
    page,
    25,
  );

  const totalPages = Math.ceil(result.count / result.pageSize);

  return (
    <div className="space-y-6">
      <header>
        <p className="label-badge">Alert Centre</p>
        <h1 className="mt-1 font-display text-section">
          {result.count.toLocaleString()} alerts
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Every critical signal from your farms, prioritized with AI insight and
          a recommended action.
        </p>
      </header>

      <AlertFilters />

      <Card>
        <CardContent className="pt-6">
          <AlertTable alerts={result.rows} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-ink-secondary">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        {currentPage > 1 && (
          <Link
            href={`?page=${currentPage - 1}`}
            className="rounded-btn border border-surface-border px-3 py-1 hover:border-brand-orange/40"
          >
            Previous
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`?page=${currentPage + 1}`}
            className="rounded-btn border border-surface-border px-3 py-1 hover:border-brand-orange/40"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
