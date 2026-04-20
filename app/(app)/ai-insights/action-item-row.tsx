'use client';

import { useState, useTransition, useRef } from 'react';
import {
  updateActionStatus,
  assignAction,
  updateActionNotes,
  addTextEvidence,
  uploadFileEvidence,
  deleteEvidence,
  type ActionResult,
} from '@/lib/actions/digests';

type ActionStatus = 'open' | 'in_progress' | 'done' | 'skipped';

export type Evidence = {
  id: string;
  kind: 'photo' | 'document' | 'text';
  storage_path: string | null;
  text_content: string | null;
  caption: string | null;
  content_type: string | null;
  size_bytes: number | null;
  signed_url: string | null; // resolved at render time in the page
  uploaded_by_email: string | null;
  uploaded_at: string;
};

export type OrgMember = {
  user_id: string;
  email: string | null;
};

type Props = {
  actionId: string;
  status: ActionStatus;
  text: string;
  notes: string | null;
  assigneeId: string | null;
  assigneeEmail: string | null;
  currentUserId: string | null;
  currentUserEmail: string | null;
  evidence: Evidence[];
  orgMembers: OrgMember[];
};

export function ActionItemRow({
  actionId,
  status,
  text,
  notes: initialNotes,
  assigneeId,
  assigneeEmail,
  currentUserId,
  currentUserEmail,
  evidence,
  orgMembers,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [notesDraft, setNotesDraft] = useState(initialNotes ?? '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [expanded, setExpanded] = useState(
    status === 'in_progress' || (initialNotes?.length ?? 0) > 0 || evidence.length > 0
  );
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function run(fn: () => Promise<ActionResult>) {
    setToast(null);
    startTransition(async () => {
      const res = await fn();
      setToast(
        res.ok
          ? { type: 'ok', text: res.message ?? 'Done' }
          : { type: 'err', text: res.error }
      );
      setTimeout(() => setToast(null), 3500);
    });
  }

  const statusLabel: Record<ActionStatus, string> = {
    open: 'Open',
    in_progress: 'In progress',
    done: 'Done',
    skipped: 'Skipped',
  };

  const statusColor: Record<ActionStatus, string> = {
    open: 'border-surface-border text-ink-secondary',
    in_progress: 'border-amber-400/50 text-amber-400',
    done: 'border-emerald-400/50 text-emerald-400',
    skipped: 'border-ink-muted/50 text-ink-muted line-through',
  };

  const isAssignedToMe = currentUserId && assigneeId === currentUserId;
  const showAssignee = assigneeId && (assigneeEmail || assigneeId);

  return (
    <div
      className={
        'rounded-btn border border-surface-border p-3 transition-colors ' +
        (status === 'done' ? 'opacity-70' : '')
      }
    >
      {/* Top row: status toggle + text */}
      <div className="flex items-start gap-3">
        <StatusCycleButton
          status={status}
          disabled={pending}
          onClick={(next) => run(() => updateActionStatus(actionId, next))}
        />
        <div className="min-w-0 flex-1">
          <p
            className={
              'text-sm ' +
              (status === 'done'
                ? 'text-ink-secondary line-through'
                : 'text-ink-primary')
            }
          >
            {text}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={
                'inline-flex items-center rounded-full border px-2 py-0.5 ' +
                statusColor[status]
              }
            >
              {statusLabel[status]}
            </span>

            {showAssignee && (
              <span className="inline-flex items-center gap-1 rounded-full border border-surface-border px-2 py-0.5 text-ink-secondary">
                <span className="text-ink-muted">→</span>
                {isAssignedToMe ? 'you' : assigneeEmail ?? 'assigned'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto text-ink-muted hover:text-brand-orange"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-surface-border pt-3">
          {/* Assign row */}
          <div className="flex flex-wrap gap-2 text-xs">
            {!isAssignedToMe && currentUserId && (
              <MiniButton
                disabled={pending}
                onClick={() => run(() => assignAction(actionId, currentUserId))}
              >
                Assign to me
              </MiniButton>
            )}
            {isAssignedToMe && (
              <MiniButton
                disabled={pending}
                onClick={() => run(() => assignAction(actionId, null))}
              >
                Unassign
              </MiniButton>
            )}
            <MiniButton
              disabled={pending}
              onClick={() => setShowAssignPicker((v) => !v)}
            >
              {showAssignPicker ? 'Close picker' : 'Assign to someone…'}
            </MiniButton>
          </div>

          {showAssignPicker && (
            <div className="rounded-btn border border-surface-border p-2">
              <p className="mb-2 text-xs text-ink-muted">
                Choose an assignee
              </p>
              <div className="flex flex-wrap gap-1">
                {orgMembers.length === 0 && (
                  <span className="text-xs text-ink-muted">
                    No other members in your organisation yet.
                  </span>
                )}
                {orgMembers.map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    disabled={pending || m.user_id === assigneeId}
                    onClick={() => {
                      run(() => assignAction(actionId, m.user_id));
                      setShowAssignPicker(false);
                    }}
                    className={
                      'rounded-full border px-2 py-1 text-xs transition-colors ' +
                      (m.user_id === assigneeId
                        ? 'border-brand-orange/60 text-brand-orange'
                        : 'border-surface-border text-ink-secondary hover:border-brand-orange/40')
                    }
                  >
                    {m.email ?? m.user_id.slice(0, 8)}
                    {m.user_id === currentUserId && ' (you)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Notes</label>
            <textarea
              value={notesDraft}
              onChange={(e) => {
                setNotesDraft(e.target.value);
                setNotesDirty(true);
              }}
              onBlur={() => {
                if (notesDirty) {
                  setNotesDirty(false);
                  run(() => updateActionNotes(actionId, notesDraft));
                }
              }}
              rows={2}
              placeholder="What did you check? What did you find?"
              className="w-full rounded-btn border border-surface-border bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-orange/40 focus:outline-none"
            />
            {notesDirty && (
              <p className="mt-1 text-[10px] text-ink-muted">
                Notes will save when you click outside the box.
              </p>
            )}
          </div>

          {/* Evidence */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-ink-muted">
                Evidence ({evidence.length})
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                  className="rounded-btn border border-surface-border px-2 py-1 text-xs hover:border-brand-orange/40 disabled:opacity-50"
                >
                  📷 Photo / File
                </button>
                <button
                  type="button"
                  onClick={() => setShowTextForm((v) => !v)}
                  disabled={pending}
                  className="rounded-btn border border-surface-border px-2 py-1 text-xs hover:border-brand-orange/40 disabled:opacity-50"
                >
                  📝 Note
                </button>
              </div>
            </div>

            {/* Hidden file input (triggers camera on mobile via capture attr) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/plain,text/csv"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.set('actionId', actionId);
                fd.set('file', file);
                run(() => uploadFileEvidence(fd));
                e.target.value = ''; // allow re-upload of same file
              }}
            />

            {/* Inline text-evidence form */}
            {showTextForm && (
              <div className="mb-2 rounded-btn border border-surface-border p-2">
                <textarea
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  rows={3}
                  placeholder="Describe the evidence (e.g. 'Fan 2 replaced at 09:15, re-tested OK')"
                  className="w-full rounded-btn border border-surface-border bg-transparent p-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-orange/40 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={pending || textDraft.trim().length === 0}
                    onClick={() => {
                      const draft = textDraft;
                      setTextDraft('');
                      setShowTextForm(false);
                      run(() => addTextEvidence(actionId, draft));
                    }}
                    className="rounded-btn bg-gradient-to-r from-orange-500 to-fuchsia-500 px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Save note
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTextDraft('');
                      setShowTextForm(false);
                    }}
                    className="rounded-btn border border-surface-border px-3 py-1 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Evidence list */}
            {evidence.length > 0 && (
              <ul className="space-y-2">
                {evidence.map((ev) => (
                  <EvidenceItem
                    key={ev.id}
                    evidence={ev}
                    disabled={pending}
                    onDelete={() => run(() => deleteEvidence(ev.id))}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {toast && (
        <p
          role="status"
          aria-live="polite"
          className={
            'mt-2 text-xs ' +
            (toast.type === 'ok' ? 'text-emerald-400' : 'text-rose-400')
          }
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────── sub-components ───────────────────────────

function StatusCycleButton({
  status,
  disabled,
  onClick,
}: {
  status: ActionStatus;
  disabled: boolean;
  onClick: (next: ActionStatus) => void;
}) {
  // Click cycles open → in_progress → done → open; Shift+click cycles backward or toggles skipped
  function nextStatus(current: ActionStatus, shift: boolean): ActionStatus {
    if (shift) return current === 'skipped' ? 'open' : 'skipped';
    const cycle: ActionStatus[] = ['open', 'in_progress', 'done'];
    const idx = cycle.indexOf(current);
    if (idx === -1) return 'open';
    // Safe non-null: modulo on a 3-element non-empty literal array is always in bounds
    return cycle[(idx + 1) % cycle.length]!;
  }

  const label =
    status === 'done'
      ? '✓'
      : status === 'in_progress'
        ? '◐'
        : status === 'skipped'
          ? '✕'
          : '○';

  const cls =
    status === 'done'
      ? 'border-emerald-400/60 text-emerald-400'
      : status === 'in_progress'
        ? 'border-amber-400/60 text-amber-400'
        : status === 'skipped'
          ? 'border-ink-muted/50 text-ink-muted'
          : 'border-surface-border text-ink-secondary hover:border-brand-orange/40';

  return (
    <button
      type="button"
      disabled={disabled}
      title="Click: open → in progress → done. Shift+click: toggle skipped."
      onClick={(e) => onClick(nextStatus(status, e.shiftKey))}
      className={
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition-colors disabled:opacity-50 ' +
        cls
      }
    >
      {label}
    </button>
  );
}

function MiniButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-btn border border-surface-border px-2 py-1 text-xs text-ink-secondary transition-colors hover:border-brand-orange/40 hover:text-ink-primary disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function EvidenceItem({
  evidence,
  disabled,
  onDelete,
}: {
  evidence: Evidence;
  disabled: boolean;
  onDelete: () => void;
}) {
  const dateStr = new Date(evidence.uploaded_at).toLocaleString();
  const size =
    evidence.size_bytes !== null
      ? `${Math.round(evidence.size_bytes / 1024)} KB`
      : null;

  return (
    <li className="flex items-start gap-2 rounded-btn border border-surface-border p-2 text-xs">
      {evidence.kind === 'photo' && evidence.signed_url && (
        <a
          href={evidence.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block shrink-0"
        >
          <img
            src={evidence.signed_url}
            alt={evidence.caption ?? 'Evidence photo'}
            className="h-16 w-16 rounded object-cover"
          />
        </a>
      )}
      {evidence.kind === 'document' && evidence.signed_url && (
        <a
          href={evidence.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-surface-border text-2xl hover:border-brand-orange/40"
        >
          📄
        </a>
      )}
      {evidence.kind === 'text' && (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-surface-border text-2xl">
          📝
        </div>
      )}

      <div className="min-w-0 flex-1">
        {evidence.caption && (
          <p className="truncate font-medium text-ink-primary">{evidence.caption}</p>
        )}
        {evidence.kind === 'text' && evidence.text_content && (
          <p className="whitespace-pre-wrap text-ink-secondary">{evidence.text_content}</p>
        )}
        <p className="mt-1 text-ink-muted">
          {evidence.kind}
          {size && ` · ${size}`}
          {evidence.uploaded_by_email && ` · ${evidence.uploaded_by_email}`}
          {` · ${dateStr}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Delete this evidence? This cannot be undone.')) onDelete();
        }}
        disabled={disabled}
        title="Delete evidence"
        className="ml-1 shrink-0 rounded px-1 text-ink-muted hover:text-rose-400 disabled:opacity-50"
      >
        ✕
      </button>
    </li>
  );
}
