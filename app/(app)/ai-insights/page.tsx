import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { listOrgMembers, signEvidenceUrl, type ActionResult } from '@/lib/actions/digests';
import { getCurrentUserId } from '@/lib/actions/alerts';
import {
  ActionItemRow,
  type Evidence,
  type OrgMember,
} from './action-item-row';

export const dynamic = 'force-dynamic';

type Tone = 'all_good' | 'watch' | 'action_required';

const TONE_META: Record<Tone, { emoji: string; label: string; className: string }> = {
  all_good: {
    emoji: '🟢',
    label: 'All good',
    className: 'border-emerald-400/40 text-emerald-400',
  },
  watch: {
    emoji: '🟡',
    label: 'Watch',
    className: 'border-amber-400/40 text-amber-400',
  },
  action_required: {
    emoji: '🔴',
    label: 'Action required',
    className: 'border-rose-400/40 text-rose-400',
  },
};

interface SearchParams {
  site?: string;
  date?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

async function loadPageData(params: SearchParams) {
  const sb = createClient();

  const [sitesRes, userId, members, currentUserRes] = await Promise.all([
    sb
      .from('sites')
      .select('id, site_name')
      .is('deleted_at', null)
      .order('site_name'),
    getCurrentUserId(),
    listOrgMembers(),
    sb.auth.getUser(),
  ]);

  const sites: { id: string; site_name: string }[] = sitesRes.data ?? [];
  if (sites.length === 0) {
    return { sites: [], site: null, date: null, dates: [], digest: null, actions: [], members, currentUserId: userId, currentUserEmail: null };
  }

  // Resolve selected site (sites.length > 0 at this point)
  const firstSite = sites[0]!;
  const siteFromParam = params.site
    ? sites.find((s) => s.id === params.site)
    : undefined;
  const selectedSite = siteFromParam ?? firstSite;

  // Find dates that have a digest for this site
  const datesRes = await sb
    .from('site_daily_summaries')
    .select('date')
    .eq('site_id', selectedSite.id)
    .eq('status', 'success')
    .order('date', { ascending: false })
    .limit(30);
  const dates = (datesRes.data ?? []).map((r) => r.date as string);

  if (dates.length === 0) {
    return { sites, site: selectedSite, date: null, dates, digest: null, actions: [], members, currentUserId: userId, currentUserEmail: currentUserRes.data.user?.email ?? null };
  }

  // Resolve selected date (dates.length > 0 at this point)
  const firstDate = dates[0]!;
  const selectedDate = params.date && dates.includes(params.date) ? params.date : firstDate;

  // Load the digest
  const digestRes = await sb
    .from('site_daily_summaries')
    .select(
      'id, date, headline, key_points, things_to_check, overall_tone, confidence, model, generated_at, telegram_sent, input_tokens, output_tokens, latency_ms'
    )
    .eq('site_id', selectedSite.id)
    .eq('date', selectedDate)
    .eq('status', 'success')
    .maybeSingle();

  if (!digestRes.data) {
    return { sites, site: selectedSite, date: selectedDate, dates, digest: null, actions: [], members, currentUserId: userId, currentUserEmail: currentUserRes.data.user?.email ?? null };
  }

  const digest = digestRes.data;

  // Load action items and their evidence
  const actionsRes = await sb
    .from('digest_action_items')
    .select(
      'id, sort_order, action_text, status, assigned_to, notes, completed_at, completed_by'
    )
    .eq('summary_id', digest.id)
    .order('sort_order');

  const actionRows = actionsRes.data ?? [];
  const actionIds = actionRows.map((a) => a.id);

  const evidenceRes = actionIds.length
    ? await sb
        .from('digest_action_evidence')
        .select(
          'id, action_item_id, kind, storage_path, text_content, caption, content_type, size_bytes, uploaded_by, uploaded_at'
        )
        .in('action_item_id', actionIds)
        .order('uploaded_at', { ascending: false })
    : { data: [] as never[] };

  // Sign storage URLs for photos/documents (parallel)
  const evidenceRaw = evidenceRes.data ?? [];
  const signed = await Promise.all(
    evidenceRaw.map((e) =>
      e.storage_path ? signEvidenceUrl(e.storage_path) : Promise.resolve(null)
    )
  );

  // Resolve uploader emails and assignee emails
  const userIds = new Set<string>();
  for (const e of evidenceRaw) if (e.uploaded_by) userIds.add(e.uploaded_by);
  for (const a of actionRows) if (a.assigned_to) userIds.add(a.assigned_to);

  const emailByUserId = new Map<string, string>();
  for (const m of members) {
    if (m.user_id && m.email) emailByUserId.set(m.user_id, m.email);
  }
  // If the current user is in userIds but not in emailByUserId, fill from session
  const currentEmail = currentUserRes.data.user?.email ?? null;
  if (userId && currentEmail && !emailByUserId.has(userId)) {
    emailByUserId.set(userId, currentEmail);
  }

  // Group evidence under each action item and assemble typed payloads
  const evidenceByAction: Record<string, Evidence[]> = {};
  evidenceRaw.forEach((e, idx) => {
    const ev: Evidence = {
      id: e.id,
      kind: e.kind as Evidence['kind'],
      storage_path: e.storage_path,
      text_content: e.text_content,
      caption: e.caption,
      content_type: e.content_type,
      size_bytes: e.size_bytes,
      signed_url: signed[idx] ?? null,
      uploaded_by_email: e.uploaded_by ? emailByUserId.get(e.uploaded_by) ?? null : null,
      uploaded_at: e.uploaded_at,
    };
    (evidenceByAction[e.action_item_id] ||= []).push(ev);
  });

  const actions = actionRows.map((a) => ({
    id: a.id as string,
    sort_order: a.sort_order as number,
    action_text: a.action_text as string,
    status: a.status as 'open' | 'in_progress' | 'done' | 'skipped',
    notes: a.notes as string | null,
    assigned_to: a.assigned_to as string | null,
    assignee_email: a.assigned_to ? emailByUserId.get(a.assigned_to) ?? null : null,
    evidence: evidenceByAction[a.id as string] ?? [],
  }));

  return {
    sites,
    site: selectedSite,
    date: selectedDate,
    dates,
    digest,
    actions,
    members,
    currentUserId: userId,
    currentUserEmail: currentEmail,
  };
}

export default async function AiInsightsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const data = await loadPageData(searchParams);
  const { sites, site, date, dates, digest, actions, members, currentUserId, currentUserEmail } = data;

  if (sites.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-section">AI Insights</h1>
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            No sites yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const doneCount = actions.filter((a) => a.status === 'done').length;
  const totalCount = actions.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">AI Insights</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Daily manager briefings generated by Claude Opus. Each site gets a structured summary and a checklist of actions with assignments, notes and evidence.
        </p>
      </header>

      {/* Site + Date selectors */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="site"
            className="block text-xs uppercase tracking-wider text-ink-muted"
          >
            Site
          </label>
          <select
            id="site"
            name="site"
            defaultValue={site?.id ?? ''}
            className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="date"
            className="block text-xs uppercase tracking-wider text-ink-muted"
          >
            Date
          </label>
          <select
            id="date"
            name="date"
            defaultValue={date ?? ''}
            className="mt-1 rounded-btn border border-surface-border bg-transparent px-3 py-1.5 text-sm"
          >
            {dates.length === 0 ? (
              <option value="">No digests yet</option>
            ) : (
              dates.map((d) => <option key={d} value={d}>{d}</option>)
            )}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-btn border border-surface-border px-3 py-1.5 text-sm transition-colors hover:border-brand-orange/40"
        >
          Load
        </button>
      </form>

      {/* Empty state */}
      {!digest && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            No digest available for {site?.site_name} on {date ?? 'any date yet'}.
            <br />
            The <span className="font-mono text-xs">swinesense-daily-manager-digest</span> Pipedream workflow runs once per day at 20:00 UTC.
          </CardContent>
        </Card>
      )}

      {/* Digest content */}
      {digest && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ' +
                        TONE_META[digest.overall_tone as Tone].className
                      }
                    >
                      {TONE_META[digest.overall_tone as Tone].emoji}{' '}
                      {TONE_META[digest.overall_tone as Tone].label}
                    </span>
                    <Badge variant="neutral">{site?.site_name}</Badge>
                    <Badge variant="neutral">{digest.date}</Badge>
                    {digest.telegram_sent && (
                      <span className="text-xs text-emerald-400">📣 sent to Telegram</span>
                    )}
                  </div>
                  <CardTitle className="mt-3 font-display text-xl">
                    {digest.headline}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-muted">Confidence</p>
                  <p className="font-display text-lg text-ink-primary">
                    {digest.confidence !== null
                      ? Math.round(Number(digest.confidence) * 100) + '%'
                      : '—'}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Actions ({doneCount} of {totalCount} done)</CardTitle>
                </CardHeader>
                <CardContent>
                  {actions.length === 0 ? (
                    <p className="py-4 text-sm text-ink-muted">
                      Nothing to do today according to Claude.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {actions.map((a) => (
                        <ActionItemRow
                          key={a.id}
                          actionId={a.id}
                          status={a.status}
                          text={a.action_text}
                          notes={a.notes}
                          assigneeId={a.assigned_to}
                          assigneeEmail={a.assignee_email}
                          currentUserId={currentUserId}
                          currentUserEmail={currentUserEmail}
                          evidence={a.evidence}
                          orgMembers={members as OrgMember[]}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key points</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(digest.key_points) && digest.key_points.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {(digest.key_points as string[]).map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-brand-orange">•</span>
                          <span className="text-ink-secondary">{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-muted">No key points.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Meta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-ink-muted">
                  <p>Model: <span className="font-mono">{digest.model ?? '—'}</span></p>
                  <p>
                    Generated:{' '}
                    {digest.generated_at
                      ? new Date(digest.generated_at).toLocaleString()
                      : '—'}
                  </p>
                  {digest.input_tokens !== null && (
                    <p>
                      Tokens: {digest.input_tokens} in / {digest.output_tokens} out
                    </p>
                  )}
                  {digest.latency_ms !== null && (
                    <p>Latency: {(digest.latency_ms / 1000).toFixed(1)}s</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
