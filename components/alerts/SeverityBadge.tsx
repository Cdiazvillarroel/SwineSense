import { Badge } from '@/components/ui/badge';
import type { AlertSeverity } from '@/lib/types/domain';

/**
 * Severity badge.
 *
 * Maps the four severity levels to brand-consistent badge variants.
 * Critical includes a pulsing dot per the brand "red dot (critical)"
 * iconography guideline.
 */
const severityMap: Record<
  AlertSeverity,
  { variant: 'neutral' | 'info' | 'warning' | 'critical'; pulse: boolean }
> = {
  Low: { variant: 'neutral', pulse: false },
  Medium: { variant: 'info', pulse: false },
  High: { variant: 'warning', pulse: false },
  Critical: { variant: 'critical', pulse: true },
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { variant, pulse } = severityMap[severity];
  return (
    <Badge variant={variant}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          severity === 'Critical'
            ? 'bg-status-critical'
            : severity === 'High'
              ? 'bg-status-warning'
              : severity === 'Medium'
                ? 'bg-status-info'
                : 'bg-ink-muted'
        } ${pulse ? 'animate-pulse-glow' : ''}`}
      />
      {severity}
    </Badge>
  );
}
