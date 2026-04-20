'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { AlertSeverity, AlertStatus } from '@/lib/types/domain';

/**
 * Alert filters.
 *
 * Client Component. State lives in URL search params so filters are
 * bookmarkable, shareable, and survive navigation. Applying a filter
 * triggers a router.push which re-renders the parent Server Component
 * with the new `searchParams` prop — Next.js pattern.
 */

const SEVERITIES: AlertSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: AlertStatus[] = ['Open', 'In Progress', 'Closed', 'Snoozed'];

export function AlertFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeSeverities = searchParams.get('severity')?.split(',') ?? [];
  const activeStatuses = searchParams.get('status')?.split(',') ?? [];

  const toggle = useCallback(
    (key: 'severity' | 'status', value: string) => {
      const params = new URLSearchParams(searchParams);
      const current = params.get(key)?.split(',').filter(Boolean) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (next.length) params.set(key, next.join(','));
      else params.delete(key);
      params.delete('page');  // reset pagination

      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams],
  );

  const clear = () => {
    startTransition(() => router.push('/alerts'));
  };

  const hasActive = activeSeverities.length > 0 || activeStatuses.length > 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-card border border-surface-border bg-surface-card p-3',
        pending && 'opacity-70',
      )}
    >
      <span className="label-badge mr-1">Severity</span>
      {SEVERITIES.map((s) => (
        <Chip
          key={s}
          active={activeSeverities.includes(s)}
          onClick={() => toggle('severity', s)}
        >
          {s}
        </Chip>
      ))}

      <span className="mx-2 h-6 w-px bg-surface-border" />

      <span className="label-badge mr-1">Status</span>
      {STATUSES.map((s) => (
        <Chip
          key={s}
          active={activeStatuses.includes(s)}
          onClick={() => toggle('status', s)}
        >
          {s}
        </Chip>
      ))}

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="ml-auto text-xs"
        >
          <X className="h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
          : 'border-surface-border text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary',
      )}
    >
      {children}
    </button>
  );
}
