import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, PawPrint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge } from '@/components/alerts/SeverityBadge';
import { AiInsightCard } from '@/components/alerts/AiInsightCard';
import { Badge } from '@/components/ui/badge';
import { alertsRepo } from '@/lib/db';
import { formatDateTime, formatRelative } from '@/lib/utils/format';

interface PageProps {
  params: { id: string };
}

export default async function AlertDetailPage({ params }: PageProps) {
  const alert = await alertsRepo.getAlert(params.id);
  if (!alert) notFound();

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
            <CardContent className="space-y-2 text-sm">
              {/* Placeholder action rows — wire up to Server Actions in a follow-up */}
              <button className="w-full rounded-btn border border-surface-border px-3 py-2 text-left hover:border-brand-orange/40">
                Assign to…
              </button>
              <button className="w-full rounded-btn border border-surface-border px-3 py-2 text-left hover:border-brand-orange/40">
                Mark in progress
              </button>
              <button className="w-full rounded-btn border border-surface-border px-3 py-2 text-left hover:border-brand-orange/40">
                Close alert
              </button>
              <button className="w-full rounded-btn border border-surface-border px-3 py-2 text-left hover:border-brand-orange/40">
                Re-run AI analysis
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
