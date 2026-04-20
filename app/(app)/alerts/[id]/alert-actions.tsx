'use client'

import { useState, useTransition } from 'react'
import {
  updateAlertStatus,
  assignAlert,
  reRunAiAnalysis,
  type ActionResult,
} from '@/lib/actions/alerts'

type AlertStatus = 'Open' | 'In Progress' | 'Closed' | 'Snoozed'

type Props = {
  alertId: string
  currentStatus: AlertStatus
  currentAssignee: string | null
  currentUserId: string | null
}

export function AlertActions({
  alertId,
  currentStatus,
  currentAssignee,
  currentUserId,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function run(fn: () => Promise<ActionResult>) {
    setToast(null)
    startTransition(async () => {
      const res = await fn()
      setToast(
        res.ok
          ? { type: 'ok', text: res.message ?? 'Done' }
          : { type: 'err', text: res.error }
      )
    })
  }

  const canMarkInProgress = currentStatus === 'Open'
  const canClose = currentStatus !== 'Closed'
  const isAssignedToMe = currentAssignee === currentUserId
  const canAssignToMe = !!currentUserId && !isAssignedToMe

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canMarkInProgress && (
        <ActionButton
          onClick={() => run(() => updateAlertStatus(alertId, 'In Progress'))}
          disabled={pending}
          variant="secondary"
          label="Mark in progress"
        />
      )}

      {canAssignToMe && (
        <ActionButton
          onClick={() => run(() => assignAlert(alertId, currentUserId!))}
          disabled={pending}
          variant="secondary"
          label="Assign to me"
        />
      )}

      {isAssignedToMe && (
        <ActionButton
          onClick={() => run(() => assignAlert(alertId, null))}
          disabled={pending}
          variant="ghost"
          label="Unassign"
        />
      )}

      <ActionButton
        onClick={() => run(() => reRunAiAnalysis(alertId))}
        disabled={pending}
        variant="secondary"
        label={pending ? 'Working…' : 'Re-run AI analysis'}
      />

      {canClose && (
        <ActionButton
          onClick={() => {
            if (window.confirm('Close this alert? You can reopen it by changing status later.')) {
              run(() => updateAlertStatus(alertId, 'Closed'))
            }
          }}
          disabled={pending}
          variant="primary"
          label="Close alert"
        />
      )}

      {toast && (
        <span
          role="status"
          aria-live="polite"
          className={
            'ml-2 text-sm ' +
            (toast.type === 'ok' ? 'text-emerald-400' : 'text-rose-400')
          }
        >
          {toast.text}
        </span>
      )}
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  label,
  variant,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  variant: 'primary' | 'secondary' | 'ghost'
}) {
  const base =
    'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ' +
    'disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 ' +
    'focus:ring-offset-2 focus:ring-offset-neutral-950'
  const styles = {
    primary:
      'bg-gradient-to-r from-orange-500 to-fuchsia-500 text-white hover:opacity-90 focus:ring-orange-500',
    secondary:
      'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 focus:ring-neutral-600',
    ghost:
      'bg-transparent text-neutral-300 hover:bg-neutral-800 focus:ring-neutral-700',
  }[variant]
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {label}
    </button>
  )
}
