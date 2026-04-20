'use client';

import { useState, useTransition } from 'react';
import {
  createNotificationChannel,
  updateNotificationChannel,
  deleteNotificationChannel,
  type ActionResult,
} from '@/lib/actions/settings';

type Channel = 'telegram' | 'whatsapp' | 'email' | 'sms';
type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type NotificationChannelRow = {
  id: string;
  channel: Channel;
  recipient: string;
  min_severity: Severity;
  active: boolean;
  created_at: string;
};

export type SiteForChannels = {
  id: string;
  site_name: string;
  channels: NotificationChannelRow[];
};

const CHANNEL_META: Record<Channel, { emoji: string; label: string; placeholder: string; help: string }> = {
  telegram: {
    emoji: '📨',
    label: 'Telegram',
    placeholder: '-1001234567890 or @username',
    help: 'Numeric chat ID or channel handle',
  },
  whatsapp: {
    emoji: '💬',
    label: 'WhatsApp',
    placeholder: '+61 400 123 456',
    help: 'Include country code',
  },
  email: {
    emoji: '✉️',
    label: 'Email',
    placeholder: 'manager@farm.com.au',
    help: 'Any valid email',
  },
  sms: {
    emoji: '📱',
    label: 'SMS',
    placeholder: '+61 400 123 456',
    help: 'Include country code',
  },
};

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export function NotificationChannelsSection({ sites }: { sites: SiteForChannels[] }) {
  return (
    <div className="space-y-4">
      {sites.length === 0 ? (
        <p className="text-sm text-ink-muted">No sites to configure.</p>
      ) : (
        sites.map((site) => <SiteChannelsCard key={site.id} site={site} />)
      )}
    </div>
  );
}

function SiteChannelsCard({ site }: { site: SiteForChannels }) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="rounded-btn border border-surface-border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base text-ink-primary">{site.site_name}</h3>
          <p className="text-xs text-ink-muted">
            {site.channels.length}{' '}
            {site.channels.length === 1 ? 'channel' : 'channels'} configured
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-btn border border-surface-border px-3 py-1 text-xs transition-colors hover:border-brand-orange/40"
        >
          {showAddForm ? 'Cancel' : '+ Add channel'}
        </button>
      </div>

      {showAddForm && (
        <AddChannelForm
          siteId={site.id}
          onDone={() => setShowAddForm(false)}
        />
      )}

      {site.channels.length === 0 ? (
        <p className="py-4 text-center text-xs text-ink-muted">
          No notification channels for this site yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {site.channels.map((c) => (
            <ChannelRow key={c.id} channel={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddChannelForm({
  siteId,
  onDone,
}: {
  siteId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [channel, setChannel] = useState<Channel>('telegram');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('site_id', siteId);
    setToast(null);
    startTransition(async () => {
      const res = await createNotificationChannel(fd);
      if (res.ok) {
        setToast({ type: 'ok', text: res.message ?? 'Created' });
        setTimeout(() => {
          onDone();
        }, 500);
      } else {
        setToast({ type: 'err', text: res.error });
      }
    });
  }

  const meta = CHANNEL_META[channel];

  return (
    <form
      onSubmit={onSubmit}
      className="mb-3 space-y-2 rounded-btn border border-surface-border bg-surface-border/20 p-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-muted">
            Type
          </label>
          <select
            name="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="mt-1 w-full rounded-btn border border-surface-border bg-transparent px-2 py-1.5 text-sm"
          >
            {(Object.keys(CHANNEL_META) as Channel[]).map((k) => (
              <option key={k} value={k}>
                {CHANNEL_META[k].emoji} {CHANNEL_META[k].label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-wider text-ink-muted">
            Recipient
          </label>
          <input
            name="recipient"
            type="text"
            required
            placeholder={meta.placeholder}
            className="mt-1 w-full rounded-btn border border-surface-border bg-transparent px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-[10px] text-ink-muted">{meta.help}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-muted">
            Min severity
          </label>
          <select
            name="min_severity"
            defaultValue="High"
            className="mt-1 w-full rounded-btn border border-surface-border bg-transparent px-2 py-1.5 text-sm"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-ink-muted">
            Only alerts at this level or higher are sent
          </p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-muted">
            Active
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="h-4 w-4 accent-brand-orange"
            />
            <span className="text-ink-secondary">Send notifications now</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-btn bg-gradient-to-r from-orange-500 to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save channel'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-btn border border-surface-border px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
        {toast && (
          <span
            className={
              'text-xs ' +
              (toast.type === 'ok' ? 'text-emerald-400' : 'text-rose-400')
            }
          >
            {toast.text}
          </span>
        )}
      </div>
    </form>
  );
}

function ChannelRow({ channel }: { channel: NotificationChannelRow }) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [recipient, setRecipient] = useState(channel.recipient);
  const [minSeverity, setMinSeverity] = useState<Severity>(channel.min_severity);

  const meta = CHANNEL_META[channel.channel];

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

  function toggleActive() {
    run(() =>
      updateNotificationChannel(channel.id, { active: !channel.active })
    );
  }

  function saveEdit() {
    run(async () => {
      const res = await updateNotificationChannel(channel.id, {
        recipient,
        min_severity: minSeverity,
      });
      if (res.ok) setEditing(false);
      return res;
    });
  }

  function onDelete() {
    if (
      !window.confirm(
        `Delete ${meta.label} notification to "${channel.recipient}"?`
      )
    )
      return;
    run(() => deleteNotificationChannel(channel.id));
  }

  return (
    <li className="flex items-start gap-3 rounded-btn border border-surface-border p-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-border text-lg">
        {meta.emoji}
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-btn border border-surface-border bg-transparent px-2 py-1 text-sm"
            />
            <div className="flex items-center gap-2">
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value as Severity)}
                className="rounded-btn border border-surface-border bg-transparent px-2 py-1 text-xs"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={saveEdit}
                className="rounded-btn bg-gradient-to-r from-orange-500 to-fuchsia-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setRecipient(channel.recipient);
                  setMinSeverity(channel.min_severity);
                }}
                className="rounded-btn border border-surface-border px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="truncate font-mono text-sm text-ink-primary">
              {channel.recipient}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span>{meta.label}</span>
              <span>·</span>
              <span>min: {channel.min_severity}</span>
              <span>·</span>
              <span className={channel.active ? 'text-emerald-400' : 'text-ink-muted'}>
                {channel.active ? 'active' : 'paused'}
              </span>
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleActive}
            disabled={pending}
            title={channel.active ? 'Pause' : 'Resume'}
            className="rounded px-2 py-1 text-xs text-ink-secondary hover:text-brand-orange disabled:opacity-50"
          >
            {channel.active ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            title="Edit"
            className="rounded px-2 py-1 text-xs text-ink-secondary hover:text-brand-orange disabled:opacity-50"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            title="Delete"
            className="rounded px-2 py-1 text-xs text-ink-muted hover:text-rose-400 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}

      {toast && (
        <span
          className={
            'ml-2 self-center text-xs ' +
            (toast.type === 'ok' ? 'text-emerald-400' : 'text-rose-400')
          }
        >
          {toast.text}
        </span>
      )}
    </li>
  );
}
