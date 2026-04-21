import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { TableUpdate } from '@/lib/database';
import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  Paginated,
} from '@/lib/types/domain';

/**
 * Alerts repository.
 *
 * Handles:
 *  - paginated listing with filters (for /alerts page)
 *  - single alert fetch with joined context (for drawer/detail)
 *  - status mutations (assign, close, snooze)
 *  - counting for KPI cards
 *
 * The AI fields (ai_insight, likely_cause, etc.) are never written from
 * the client — only from the Pipedream callback route handler using the
 * service-role client.
 */

export interface AlertFilters {
  siteIds?: string[];
  penIds?: string[];
  severities?: AlertSeverity[];
  statuses?: AlertStatus[];
  types?: string[];
  from?: string;   // ISO date
  to?: string;
  search?: string; // matches trigger_reason / short_message
}

interface AlertRow {
  id: string;
  timestamp: string;
  site_id: string;
  pen_id: string | null;
  animal_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  score: number | null;
  trigger_reason: string | null;
  ai_insight: string | null;
  likely_cause: string | null;
  recommended_action: string | null;
  priority_level: Alert['priorityLevel'];
  short_message: string | null;
  requires_vet_escalation: boolean;
  status: AlertStatus;
  assigned_to: string | null;
  closed_timestamp: string | null;
  notification_sent: boolean;
  ai_ready: boolean;
  ai_processed: boolean;
  ai_timestamp: string | null;
  ai_response_status: Alert['aiResponseStatus'];
  sites?: { site_name: string } | null;
  pens?: { pen_name: string } | null;
  animals?: { tag_number: string } | null;
}

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    timestamp: row.timestamp,
    siteId: row.site_id,
    siteName: row.sites?.site_name,
    penId: row.pen_id,
    penName: row.pens?.pen_name,
    animalId: row.animal_id,
    animalTag: row.animals?.tag_number,
    type: row.alert_type,
    severity: row.severity,
    score: row.score,
    triggerReason: row.trigger_reason,
    aiInsight: row.ai_insight,
    likelyCause: row.likely_cause,
    recommendedAction: row.recommended_action,
    priorityLevel: row.priority_level,
    shortMessage: row.short_message,
    requiresVetEscalation: row.requires_vet_escalation ?? false,
    status: row.status,
    assignedTo: row.assigned_to,
    closedAt: row.closed_timestamp,
    notificationSent: row.notification_sent ?? false,
    aiReady: row.ai_ready ?? false,
    aiProcessed: row.ai_processed ?? false,
    aiTimestamp: row.ai_timestamp,
    aiResponseStatus: row.ai_response_status,
  };
}

const SELECT_WITH_JOINS = `
  *,
  sites:site_id (site_name),
  pens:pen_id (pen_name),
  animals:animal_id (tag_number)
`;

export async function listAlerts(
  filters: AlertFilters = {},
  page = 1,
  pageSize = 25,
): Promise<Paginated<Alert>> {
  const supabase = createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('alerts')
    .select(SELECT_WITH_JOINS, { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(from, to);

  if (filters.siteIds?.length) query = query.in('site_id', filters.siteIds);
  if (filters.penIds?.length) query = query.in('pen_id', filters.penIds);
  if (filters.severities?.length) query = query.in('severity', filters.severities);
  if (filters.statuses?.length) query = query.in('status', filters.statuses);
  if (filters.types?.length) query = query.in('alert_type', filters.types);
  if (filters.from) query = query.gte('timestamp', filters.from);
  if (filters.to) query = query.lte('timestamp', filters.to);
  if (filters.search) {
    query = query.or(
      `trigger_reason.ilike.%${filters.search}%,short_message.ilike.%${filters.search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`listAlerts: ${error.message}`);

  return {
    rows: (data as unknown as AlertRow[]).map(mapAlert),
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAlert(id: string): Promise<Alert | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('alerts')
    .select(SELECT_WITH_JOINS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getAlert: ${error.message}`);
  return data ? mapAlert(data as unknown as AlertRow) : null;
}

export async function countOpenBySeverity(
  siteId?: string,
): Promise<Record<AlertSeverity, number>> {
  const supabase = createClient();
  let query = supabase
    .from('alerts')
    .select('severity', { count: 'exact', head: false })
    .neq('status', 'Closed');

  if (siteId) query = query.eq('site_id', siteId);

  const { data, error } = await query;
  if (error) throw new Error(`countOpenBySeverity: ${error.message}`);

  const counts: Record<AlertSeverity, number> = {
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };
  for (const row of data ?? []) {
    const sev = (row as { severity: AlertSeverity }).severity;
    counts[sev] = (counts[sev] ?? 0) + 1;
  }
  return counts;
}

export async function updateAlertStatus(
  id: string,
  status: AlertStatus,
): Promise<void> {
  const supabase = createClient();
  const patch: TableUpdate<'alerts'> = { status };
  if (status === 'Closed') patch.closed_timestamp = new Date().toISOString();

  const { error } = await supabase.from('alerts').update(patch).eq('id', id);
  if (error) throw new Error(`updateAlertStatus: ${error.message}`);
}
