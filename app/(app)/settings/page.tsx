import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { listOrgMembers } from '@/lib/actions/digests';
import {
  NotificationChannelsSection,
  type SiteForChannels,
} from './notification-channels-section';
import { AlertRulesSection, type AlertRule } from './alert-rules-section';

export const dynamic = 'force-dynamic';

const ROLE_BADGE: Record<string, string> = {
  owner: 'border-brand-orange/60 text-brand-orange',
  manager: 'border-amber-400/50 text-amber-400',
  vet: 'border-sky-400/50 text-sky-400',
  operator: 'border-emerald-400/50 text-emerald-400',
  viewer: 'border-ink-muted/50 text-ink-muted',
};

async function loadData() {
  const sb = createClient();

  const [userRes, orgsRes, membershipRes, sitesRes, channelsRes, rulesRes, membersRes] =
    await Promise.all([
      sb.auth.getUser(),
      sb.from('organizations').select('id, name, slug, plan, active, created_at'),
      sb.from('users_organizations').select('organization_id, role'),
      sb.from('sites').select('id, site_name').is('deleted_at', null).order('site_name'),
      sb
        .from('site_notification_channels')
        .select('id, site_id, channel, recipient, min_severity, active, created_at')
        .order('created_at', { ascending: true }),
      sb
        .from('alert_rules')
        .select('id, rule_key, display_name, description, severity, active, requires_ai')
        .order('severity', { ascending: false })
        .order('display_name'),
      listOrgMembers(),
    ]);

  const user = userRes.data.user;
  const orgs = orgsRes.data ?? [];
  const memberships = membershipRes.data ?? [];
  const sites = sitesRes.data ?? [];
  const channels = channelsRes.data ?? [];
  const rules = (rulesRes.data ?? []) as AlertRule[];
  const members = membersRes ?? [];

  // Attach role labels to each org
  const orgsWithRole = orgs.map((o) => ({
    ...o,
    my_role:
      memberships.find((m) => m.organization_id === o.id)?.role ?? 'viewer',
  }));

  // Current user's "highest" role across all orgs (for permission checks)
  const myRoles = memberships.map((m) => m.role);
  const isOwnerOrManager =
    myRoles.includes('owner') || myRoles.includes('manager');

  // Group channels by site
  const sitesWithChannels: SiteForChannels[] = sites.map((s) => ({
    id: s.id,
    site_name: s.site_name,
    channels: channels
      .filter((c) => c.site_id === s.id)
      .map((c) => ({
        id: c.id,
        channel: c.channel as 'telegram' | 'whatsapp' | 'email' | 'sms',
        recipient: c.recipient,
        min_severity: c.min_severity as 'Low' | 'Medium' | 'High' | 'Critical',
        active: c.active,
        created_at: c.created_at,
      })),
  }));

  return {
    user,
    orgs: orgsWithRole,
    sites: sitesWithChannels,
    rules,
    members,
    isOwnerOrManager,
  };
}

export default async function SettingsPage() {
  const { user, orgs, sites, rules, members, isOwnerOrManager } = await loadData();

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-section">Settings</h1>
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            Please sign in to view settings.
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeRulesCount = rules.filter((r) => r.active).length;
  const totalChannels = sites.reduce((sum, s) => sum + s.channels.length, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-section">Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Your profile, organisation, team members, notification delivery and alert rules.
        </p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-muted">Email</dt>
              <dd className="mt-1 text-ink-primary">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-muted">User ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-ink-secondary">{user.id}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-muted">
                Signed up
              </dt>
              <dd className="mt-1 text-ink-secondary">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Organisations */}
      <Card>
        <CardHeader>
          <CardTitle>Organisation{orgs.length > 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-ink-muted">
              You are not a member of any organisation.
            </p>
          ) : (
            <div className="space-y-3">
              {orgs.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-btn border border-surface-border p-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base text-ink-primary">
                        {o.name}
                      </span>
                      <Badge variant="neutral">{o.plan ?? 'trial'}</Badge>
                      <span
                        className={
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' +
                          (ROLE_BADGE[o.my_role] ?? ROLE_BADGE.viewer)
                        }
                      >
                        your role: {o.my_role}
                      </span>
                      {!o.active && (
                        <span className="text-xs text-rose-400">inactive</span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      {o.slug}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle>Team members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-ink-muted">No teammates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.user_id}
                      className="border-b border-surface-border last:border-0"
                    >
                      <td className="px-3 py-2 text-ink-primary">
                        {m.email ?? '—'}
                        {m.user_id === user.id && (
                          <span className="ml-2 text-xs text-brand-orange">(you)</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs ' +
                            (ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer)
                          }
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                        {m.user_id.slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ink-muted">
                Inviting new members is not yet available via the UI. Add them directly in
                Supabase Authentication and insert a row in <span className="font-mono">users_organizations</span>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification channels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Notification channels ({totalChannels})</CardTitle>
            <span className="text-xs text-ink-muted">
              How alerts and daily digests reach your team
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <NotificationChannelsSection sites={sites} />
          <p className="mt-3 text-xs text-ink-muted">
            Channels are used by the alert pipeline and by the{' '}
            <span className="font-mono">swinesense-daily-manager-digest</span>{' '}
            workflow. Changes take effect on the next run.
          </p>
        </CardContent>
      </Card>

      {/* Alert rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>
              Alert rules ({activeRulesCount} of {rules.length} active)
            </CardTitle>
            {!isOwnerOrManager && (
              <span className="text-xs text-ink-muted">Read-only (requires owner/manager)</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AlertRulesSection rules={rules} canEdit={isOwnerOrManager} />
          <p className="mt-3 text-xs text-ink-muted">
            Disabled rules stop producing new alerts. Existing alerts are not affected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
