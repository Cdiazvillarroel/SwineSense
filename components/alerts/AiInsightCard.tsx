import { Sparkles, AlertTriangle, Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils/format';
import type { Alert, PriorityLevel } from '@/lib/types/domain';

/**
 * AI Insight Card.
 *
 * Renders the Claude-generated fields on an alert. Handles three states:
 *  1. AI not yet processed → pending skeleton
 *  2. AI failed → error notice with retry hint
 *  3. AI success → full insight block
 *
 * The brand voice mandates the "Sparkles" icon paired with a gradient
 * accent line ("AI Engine" module identifier per brand guidelines).
 */

const priorityToVariant: Record<PriorityLevel, 'neutral' | 'info' | 'warning' | 'critical'> = {
  Routine: 'neutral',
  Attention: 'info',
  Urgent: 'warning',
  Immediate: 'critical',
};

export function AiInsightCard({ alert }: { alert: Alert }) {
  if (!alert.aiReady) {
    return (
      <Card className="p-5">
        <Header />
        <p className="mt-4 text-sm text-ink-muted">
          This alert type does not require AI analysis.
        </p>
      </Card>
    );
  }

  if (!alert.aiProcessed) {
    return (
      <Card accent className="p-5">
        <Header />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-border" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-surface-border" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface-border" />
        </div>
        <p className="mt-4 text-xs text-ink-muted">Analysis in progress…</p>
      </Card>
    );
  }

  if (alert.aiResponseStatus === 'failed') {
    return (
      <Card className="border-status-critical/30 p-5">
        <Header />
        <div className="mt-4 flex items-start gap-2 text-sm text-status-critical">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p>AI analysis failed for this alert.</p>
            <p className="mt-1 text-xs text-ink-muted">
              The operations team has been notified. Retry in a few minutes.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card accent className="p-5">
      <Header />

      <div className="mt-5 space-y-5">
        {alert.priorityLevel && (
          <div className="flex items-center gap-2">
            <span className="label-badge">Priority</span>
            <Badge variant={priorityToVariant[alert.priorityLevel]}>
              {alert.priorityLevel}
            </Badge>
          </div>
        )}

        <Field label="Insight" value={alert.aiInsight} />
        <Field label="Likely cause" value={alert.likelyCause} />
        <Field label="Recommended action" value={alert.recommendedAction} highlight />

        {alert.requiresVetEscalation && (
          <div className="flex items-start gap-2 rounded-btn border border-brand-orange/30 bg-brand-orange/5 p-3 text-sm">
            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            <p className="text-ink-primary">
              <span className="font-semibold text-brand-orange">Vet escalation recommended.</span>{' '}
              Patterns in the data suggest a clinical review is appropriate.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-surface-border pt-3 text-xs text-ink-muted">
          <span>Processed {formatRelative(alert.aiTimestamp)}</span>
        </div>
      </div>
    </Card>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-brand-orange" />
      <h3 className="font-display text-lg">AI Analysis</h3>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="label-badge">{label}</p>
      <p
        className={`mt-1 text-sm leading-relaxed ${
          highlight ? 'text-ink-primary' : 'text-ink-secondary'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
