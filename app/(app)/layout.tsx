import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { sitesRepo, alertsRepo } from '@/lib/db';

/**
 * Authenticated shell.
 *
 * Guards the route group, fetches the user's sites and the current
 * critical-alerts badge count in one place so every child page gets
 * a consistent topbar and sidebar.
 *
 * Auth check is also done in middleware but repeated here as defense-
 * in-depth: a Server Component rendering is the last line before data
 * is sent to the browser.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Parallel-load shell data. Failures shouldn't block render.
  const [sites, severityCounts] = await Promise.all([
    sitesRepo.listSites().catch(() => []),
    alertsRepo.countOpenBySeverity().catch(() => ({
      Low: 0, Medium: 0, High: 0, Critical: 0,
    })),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar criticalAlertsCount={severityCounts.Critical} />

      <div className="pl-60">
        <Topbar sites={sites} currentSiteId={null} userEmail={user.email ?? '—'} />
        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
