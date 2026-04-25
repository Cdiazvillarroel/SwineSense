import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/devices/[id]` redirects to `/devices?device=<id>` which opens the device
 * detail drawer. Kept for any external links pointing to the legacy URL.
 */
export default async function DeviceRedirectPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/devices?device=${id}`);
}
