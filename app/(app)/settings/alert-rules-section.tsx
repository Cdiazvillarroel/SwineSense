'use client';

import { useState, useTransition } from 'react';
import { toggleAlertRule } from '@/lib/actions/settings';

type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type AlertRule = {
  id: string;
  rule_key: string;
  display_name: string;
  description: string | null;
  severity: Severity;
  active: boolean;
  requires_ai: boolean;
};

const SEVERITY_COLOR: Record<Severity, string> = {
  Low: 'border-sky-400/40 text-sky-400',
  Medium: 'border-amber-400/40 text-amber-400',
  High: 'border-orange-400/40 text-orange-400',
  Critical: 'border-rose-400/40 text-rose-400',
};

export function AlertRulesSection({ rules, canEdit }: { rules: AlertRule[]; canEdit: boolean }) {
  if (rules.length === 0) {
    return <p className="text-sm text-ink-muted">No alert rules configured.</p>;
  }

  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <AlertRuleRow key={r.id} rule={r} canEdit={canEdit} />
      ))}
    </div>
  );
}

function AlertRuleRow({ rule, canEdit }: { rule: AlertRule; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [optimisticActive, setOptimisticActive] = useState(rule.active);

  function onToggle() {
    const next = !optimisticActive;
    setOptimisticActive(next); // optimistic
    setToast(null);
    startTransition(async () => {
      const res = await toggleAlertRule(rule.id, next);
      if (res.ok) {
        setToast({ type: 'ok', text: res.message ?? 'Updated' });
      } else {
        setOptimisticActive(!next); // revert
        setToast({ type: 'err', text: res.error });
      }
      setTimeout(() => setToast(null), 3000);
    });
  }

  return (
    <div
      className={
        'flex items-start gap-3 rounded-btn border border-surface-border p-3 ' +
        (optimisticActive ? '' : 'opacity-60')
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink-primary">{rule.display_name}</span>
          <span
            className={
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' +
              SEVERITY_COLOR[rule.severity]
            }
          >
            {rule.severity}
          </span>
          {rule.requires_ai && (
            <span className="inline-flex items-center rounded-full border border-surface-border px-2 py-0.5 text-xs text-ink-muted">
              ✦ AI
            </span>
          )}
          <span className="font-mono text-xs text-ink-muted">{rule.rule_key}</span>
        </div>
        {rule.description && (
          <p className="mt-1 text-xs text-ink-secondary">{rule.description}</p>
        )}
        {toast && (
          <p
            className={
              'mt-1 text-xs ' +
              (toast.type === 'ok' ? 'text-emerald-400' : 'text-rose-400')
            }
          >
            {toast.text}
          </p>
        )}
      </div>

      <ToggleSwitch
        active={optimisticActive}
        disabled={!canEdit || pending}
        onChange={onToggle}
      />
    </div>
  );
}

function ToggleSwitch({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onChange}
      title={disabled ? 'Requires owner or manager role' : active ? 'Disable rule' : 'Enable rule'}
      className={
        'relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ' +
        'disabled:cursor-not-allowed disabled:opacity-50 ' +
        (active
          ? 'border-emerald-400/60 bg-emerald-400/30'
          : 'border-surface-border bg-surface-border/40')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full transition-transform ' +
          (active
            ? 'translate-x-6 bg-emerald-400'
            : 'translate-x-1 bg-ink-muted')
        }
      />
    </button>
  );
}
