import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from './SeverityBadge';
import { formatRelative, truncate } from '@/lib/utils/format';
import type { Alert } from '@/lib/types/domain';

/**
 * Alert table.
 *
 * Server Component. Rows link to /alerts/[id] for the detail view.
 * AI short_message takes priority over trigger_reason when present —
 * it's the human-readable version.
 */

interface AlertTableProps {
  alerts: Alert[];
}

const statusToVariant = {
  Open: 'critical',
  'In Progress': 'warning',
  Closed: 'success',
  Snoozed: 'neutral',
} as const;

export function AlertTable({ alerts }: AlertTableProps) {
  if (alerts.length === 0) {
    return (
      <TableEmpty>
        No alerts match your filters. Sensors are reporting nominal activity.
      </TableEmpty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Site · Pen · Animal</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="w-[360px]">Message</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <SeverityBadge severity={a.severity} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-ink-secondary">
              {formatRelative(a.timestamp)}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <span className="text-ink-primary">{a.siteName ?? '—'}</span>
                {a.penName && (
                  <span className="text-ink-muted"> · {a.penName}</span>
                )}
                {a.animalTag && (
                  <span className="text-ink-muted"> · #{a.animalTag}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="font-mono text-xs text-ink-secondary">
                {a.type}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-ink-primary">
                {truncate(
                  a.shortMessage ?? a.triggerReason ?? 'Awaiting AI analysis…',
                  90,
                )}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant={statusToVariant[a.status]}>{a.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/alerts/${a.id}`}
                className="inline-flex items-center gap-1 text-brand-orange hover:underline"
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
