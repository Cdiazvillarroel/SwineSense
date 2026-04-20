import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Site } from '@/lib/types/domain';

/**
 * Sites repository.
 *
 * Encapsulates every DB query related to sites. Components/pages import
 * these functions instead of calling Supabase directly. This keeps the
 * data access layer testable and swappable.
 *
 * All queries respect Row Level Security: a user only sees sites in
 * organizations they belong to.
 */

function mapSite(row: Record<string, unknown>): Site {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.site_name as string,
    managerName: (row.manager_name as string | null) ?? null,
    location: (row.location_address as string | null) ?? null,
    timezone: (row.timezone as string) ?? 'UTC',
    totalAnimals: (row.total_animals as number) ?? 0,
    active: Boolean(row.active),
    createdAt: row.created_at as string,
  };
}

export async function listSites(): Promise<Site[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .is('deleted_at', null)
    .eq('active', true)
    .order('site_name');

  if (error) throw new Error(`listSites: ${error.message}`);
  return (data ?? []).map(mapSite);
}

export async function getSite(id: string): Promise<Site | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getSite: ${error.message}`);
  return data ? mapSite(data) : null;
}
