import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/pens/[id]` redirects to `/pens?pen=<id>` which opens the pen detail
 * drawer. Kept as a route so existing links from anywhere continue to work.
 */
export default async function PenRedirectPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/pens?pen=${id}`);
}
