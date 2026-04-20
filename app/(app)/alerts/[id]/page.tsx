import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, PawPrint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge } from '@/components/alerts/SeverityBadge';
import { AiInsightCard } from '@/components/alerts/AiInsightCard';
import { Badge } from '@/components/ui/badge';
import { alertsRepo } from '@/lib/db';
import { formatDateTime, formatRelative } from '@/lib/utils/format';
import { AlertActions } from './alert-actions';
import { getCurrentUserId } from '@/lib/actions/alerts';

interface PageProps {
  params: { id: string };
}

export default async function AlertDetailPage({ params }: PageProps) {
  const [alert, currentUserId] = await Promise.all([
    alertsRepo.getAlert(params.id),
    getCurrentUserId(),
  ]);
  if (!alert) notFound();

  // If the repo's Alert type doesn't expose `assignedTo` yet, this safely
  // falls back to null. The write path (assignAlert) still works end-to-end;
  // the UI just won't be able to show the "Unassign" variant of the button.
  const currentAssignee =
    (alert as { assignedTo?: string | null }).assignedTo ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/alerts"
        className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-orange"
      >
        <ArrowLeft className="h-4 w-4" /> Back to alerts
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <Badge variant="neutral">{alert.status}</Badge>
            <span className="font-mono text-xs text-ink-muted">{alert.type}</span>
          </div>
          <h1 className="mt-2 font-display text-section">
            {alert.shortMessage ?? alert.triggerReason ?? 'Alert details'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-secondary">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {formatDateTime(alert.timestamp)}{' '}
              <span className="text-ink-muted">({formatRelative(alert.timestamp)})</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {alert.siteName ?? '—'}
              {alert.penName && ` · ${alert.penName}`}
            </span>
            {alert.animalTag && (
              <span className="flex items-center gap-1">
                <PawPrint className="h-4 w-4" /> #{alert.animalTag}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-primary">
                {alert.triggerReason ?? '—'}
              </p>
              {alert.score !== null && (
                <p className="mt-2 text-xs text-ink-muted">
                  Score: {alert.score}
                </p>
              )}
            </CardContent>
          </Card>

          <AiInsightCard alert={alert} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertActions
                alertId={params.id}
                currentStatus={alert.status}
                currentAssignee={currentAssignee}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
