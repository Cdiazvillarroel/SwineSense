import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * The old `/sites/[id]` route now redirects to `/sites?site=<id>` which
 * opens the site detail drawer. Kept as a route so existing links (from
 * emails, alerts, bookmarks) continue to work.
 */
export default async function SiteRedirectPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/sites?site=${id}`);
}
