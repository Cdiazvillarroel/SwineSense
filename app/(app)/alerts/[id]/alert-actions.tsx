'use client';

import { useState, useTransition } from 'react';
import {
  updateAlertStatus,
  assignAlert,
  reRunAiAnalysis,
  type ActionResult,
} from '@/lib/actions/alerts';

type AlertStatus = 'Open' | 'In Progress' | 'Closed' | 'Snoozed';

type Props = {
  alertId: string;
  currentStatus: AlertStatus;
  currentAssignee: string | null;
  currentUserId: string | null;
};

/**
 * Action buttons for an alert. Renders only the row list — the calling page
 * wraps it in the existing <Card><CardContent>...</CardContent></Card>.
 */
export function AlertActions({
  alertId,
  currentStatus,
  currentAssignee,
  currentUserId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setToast(null);
    startTransition(async () => {
      const res = await fn();
      setToast(
        res.ok
          ? { type: 'ok', text: res.message ?? 'Done' }
          : { type: 'err', text: res.error }
      );
    });
  }

  const canMarkInProgress = currentStatus === 'Open';
  const canClose = currentStatus !== 'Closed';
  const isAssignedToMe = !!currentUserId && currentAssignee === currentUserId;
  const canAssignToMe = !!currentUserId && !isAssignedToMe;

  return (
    <div className="space-y-2 text-sm">
      {canMarkInProgress && (
        <ActionRow
          disabled={pending}
          onClick={() => run(() => updateAlertStatus(alertId, 'In Progress'))}
        >
          Mark in progress
        </ActionRow>
      )}

      {canAssignToMe && (
        <ActionRow
          disabled={pending}
          onClick={() => run(() => assignAlert(alertId, currentUserId!))}
        >
          Assign to me
        </ActionRow>
      )}

      {isAssignedToMe && (
        <ActionRow
          disabled={pending}
          onClick={() => run(() => assignAlert(alertId, null))}
        >
          Unassign
        </ActionRow>
      )}

      <ActionRow
        disabled={pending}
        onClick={() => run(() => reRunAiAnalysis(alertId))}
      >
        {pending ? 'Working…' : 'Re-run AI analysis'}
      </ActionRow>

      {canClose && (
        <ActionRow
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                'Close this alert? You can reopen it later by changing its status.'
              )
            ) {
              run(() => updateAlertStatus(alertId, 'Closed'));
            }
          }}
        >
          Close alert
        </ActionRow>
      )}

      {toast && (
        <p
          role="status"
          aria-live="polite"
          className={
            'pt-2 text-xs ' +
            (toast.type === 'ok' ? 'text-emerald-400' : 'text-rose-400')
          }
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}

function ActionRow({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-btn border border-surface-border px-3 py-2 text-left transition-colors hover:border-brand-orange/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
