import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Site } from '@/lib/types/domain';
import { computeThi, getThiCategory, type ThiCategory } from '@/lib/weather';

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

// ---------------------------------------------------------------------------
// Internal helpers for queries that hit columns missing from generated types.
//
// `ammonia_ppm` was added via migration but the local `lib/database.ts` types
// haven't been regenerated yet. Until then we cast through this minimal shape
// to bypass the typed client. Run the type generator to remove these casts:
//   npx supabase gen types typescript --project-id beruskdysooyzwyhucga \
//     --schema public > lib/database.ts
// ---------------------------------------------------------------------------

interface UntypedQuery
  extends PromiseLike<{ data: unknown[] | null; error: Error | null }> {
  select: (cols: string) => UntypedQuery;
  eq: (col: string, val: unknown) => UntypedQuery;
  gte: (col: string, val: unknown) => UntypedQuery;
  order: (col: string, opts?: { ascending: boolean }) => UntypedQuery;
}
interface UntypedClient {
  from: (table: string) => UntypedQuery;
}

interface EnvRowKpi {
  site_id: string | null;
  ambient_temp_c: number | null;
  humidity_pct: number | null;
  thi: number | null;
  ammonia_ppm: number | null;
  ventilation_score: number | null;
  timestamp: string;
}

interface EnvRowDetail {
  pen_id: string | null;
  ambient_temp_c: number | null;
  humidity_pct: number | null;
  thi: number | null;
  ammonia_ppm: number | null;
  ventilation_score: number | null;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Existing functions — preserved for backward compatibility
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// New types for upgraded /sites module
// ---------------------------------------------------------------------------

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SitesKpis {
  fleet: {
    total_sites: number;
    total_animals: number;
    total_pens: number;
    devices_online: number;
    devices_total: number;
    animals_by_site: { site_name: string; count: number }[];
  };
  climate: {
    avg_temp_24h: number | null;
    avg_humidity_24h: number | null;
    temp_series_24h: { hour: string; avg: number }[];
  };
  thi: {
    avg_24h: number | null;
    max_24h: number | null;
    sites_in_alert: number;
    by_site: {
      site_id: string;
      site_name: string;
      avg_thi: number | null;
      category: ThiCategory | null;
    }[];
  };
  air: {
    avg_ammonia_24h: number | null;
    avg_ventilation_24h: number | null;
    concerning_readings: number; // ammonia > 25 ppm
  };
  alerts: {
    total_open: number;
    by_severity: { severity: AlertSeverity; count: number }[];
  };
}

export interface SiteCardData {
  id: string;
  site_name: string;
  location_address: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;

  animals_count: number;
  pens_count: number;
  devices_online: number;
  devices_total: number;

  current_temp: number | null;
  current_humidity: number | null;
  current_thi: number | null;
  current_ammonia: number | null;
  current_ventilation: number | null;
  thi_category: ThiCategory | null;
  last_reading_at: string | null;

  thi_series_24h: { hour: string; avg: number }[];

  open_alerts: number;
  critical_alerts: number;
  highest_severity: AlertSeverity | null;
}

export interface SiteDetailData extends SiteCardData {
  notes: string | null;
  series_7d: {
    bucket: string;
    temp: number | null;
    humidity: number | null;
    thi: number | null;
    ammonia: number | null;
    ventilation: number | null;
  }[];
  pens: {
    id: string;
    pen_name: string;
    pen_type: string;
    capacity: number | null;
    current_animals: number | null;
    last_temp: number | null;
    last_humidity: number | null;
    last_thi: number | null;
    last_ammonia: number | null;
    last_reading_at: string | null;
  }[];
  recent_alerts: {
    id: string;
    timestamp: string;
    severity: AlertSeverity;
    status: string;
    alert_type: string;
    short_message: string | null;
    recommended_action: string | null;
  }[];
  kpi: {
    overall_status: string | null;
    animals_at_risk: number | null;
    environment_risk_index: number | null;
    devices_offline: number | null;
    devices_low_battery: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// 1. Fleet-level KPIs
// ---------------------------------------------------------------------------

export async function getSitesKpis(): Promise<SitesKpis> {
  const sb = createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Sites + counts per site (animals, pens, devices)
  const [sitesRes, animalsRes, pensRes, devicesRes, envRes, alertsRes] =
    await Promise.all([
      sb
        .from('sites')
        .select('id, site_name')
        .is('deleted_at', null)
        .eq('active', true)
        .order('site_name'),
      sb
        .from('animals')
        .select('site_id')
        .eq('active', true)
        .is('deleted_at', null),
      sb.from('pens').select('site_id').is('deleted_at', null),
      sb
        .from('devices')
        .select('site_id, signal_status, active')
        .eq('active', true),
      // Cast to bypass typed client — ammonia_ppm exists in DB but not yet
      // in the generated types in lib/database.ts. Re-run the type generator
      // to restore strict typing on this query.
      (sb as unknown as UntypedClient)
        .from('environment_raw')
        .select(
          'site_id, ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
        )
        .gte('timestamp', since24h),
      sb
        .from('alerts')
        .select('site_id, severity, status')
        .eq('status', 'Open'),
    ]);

  const sites = sitesRes.data ?? [];
  const sitesMap = new Map(sites.map((s) => [s.id, s.site_name]));

  // Animals per site
  const animalsBySite = new Map<string, number>();
  for (const a of animalsRes.data ?? []) {
    if (!a.site_id) continue;
    animalsBySite.set(a.site_id, (animalsBySite.get(a.site_id) ?? 0) + 1);
  }

  // Devices online + total
  let devicesOnline = 0;
  let devicesTotal = 0;
  for (const d of devicesRes.data ?? []) {
    devicesTotal += 1;
    if (d.signal_status === 'online') devicesOnline += 1;
  }

  // Climate aggregates from environment_raw
  const env = (envRes.data ?? []) as EnvRowKpi[];
  const temps = env
    .map((r) => Number(r.ambient_temp_c))
    .filter((n) => Number.isFinite(n));
  const humidities = env
    .map((r) => Number(r.humidity_pct))
    .filter((n) => Number.isFinite(n));
  const this_ = env.map((r) => Number(r.thi)).filter((n) => Number.isFinite(n));
  const ammonias = env
    .map((r) => Number(r.ammonia_ppm))
    .filter((n) => Number.isFinite(n));
  const vents = env
    .map((r) => Number(r.ventilation_score))
    .filter((n) => Number.isFinite(n));

  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10 : null;

  // THI by site
  const thiBySite = new Map<string, number[]>();
  for (const r of env) {
    if (!r.site_id || r.thi === null) continue;
    const arr = thiBySite.get(r.site_id) ?? [];
    arr.push(Number(r.thi));
    thiBySite.set(r.site_id, arr);
  }

  const thiSiteRows = sites.map((s) => {
    const vals = thiBySite.get(s.id) ?? [];
    const avgThi = vals.length ? avg(vals) : null;
    return {
      site_id: s.id,
      site_name: s.site_name,
      avg_thi: avgThi,
      category: avgThi !== null ? getThiCategory(avgThi) : null,
    };
  });
  const sitesInAlert = thiSiteRows.filter(
    (r) => r.category && r.category !== 'comfort',
  ).length;

  // Hourly temp series
  const hourMap = new Map<string, { sum: number; count: number }>();
  for (const r of env) {
    if (!r.timestamp || r.ambient_temp_c === null) continue;
    const hour = new Date(r.timestamp).toISOString().slice(0, 13) + ':00:00Z';
    const cell = hourMap.get(hour) ?? { sum: 0, count: 0 };
    cell.sum += Number(r.ambient_temp_c);
    cell.count += 1;
    hourMap.set(hour, cell);
  }
  const tempSeries = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, { sum, count }]) => ({
      hour,
      avg: Math.round((sum / count) * 10) / 10,
    }));

  // Alerts
  const alerts = alertsRes.data ?? [];
  const sevCounts = new Map<AlertSeverity, number>([
    ['Critical', 0],
    ['High', 0],
    ['Medium', 0],
    ['Low', 0],
  ]);
  for (const a of alerts) {
    const sev = a.severity as AlertSeverity;
    sevCounts.set(sev, (sevCounts.get(sev) ?? 0) + 1);
  }

  return {
    fleet: {
      total_sites: sites.length,
      total_animals: (animalsRes.data ?? []).length,
      total_pens: (pensRes.data ?? []).length,
      devices_online: devicesOnline,
      devices_total: devicesTotal,
      animals_by_site: sites.map((s) => ({
        site_name: s.site_name,
        count: animalsBySite.get(s.id) ?? 0,
      })),
    },
    climate: {
      avg_temp_24h: avg(temps),
      avg_humidity_24h: avg(humidities),
      temp_series_24h: tempSeries,
    },
    thi: {
      avg_24h: avg(this_),
      max_24h: this_.length ? Math.max(...this_) : null,
      sites_in_alert: sitesInAlert,
      by_site: thiSiteRows,
    },
    air: {
      avg_ammonia_24h: avg(ammonias),
      avg_ventilation_24h: avg(vents),
      concerning_readings: ammonias.filter((a) => a > 25).length,
    },
    alerts: {
      total_open: alerts.length,
      by_severity: Array.from(sevCounts.entries()).map(([severity, count]) => ({
        severity,
        count,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Sites grid — one card per site, with current readings + 24h trend
// ---------------------------------------------------------------------------

export async function getSitesGrid(): Promise<SiteCardData[]> {
  const sb = createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [sitesRes, animalsRes, pensRes, devicesRes, envRes, alertsRes] =
    await Promise.all([
      sb
        .from('sites')
        .select(
          'id, site_name, location_address, manager_name, manager_phone, timezone, latitude, longitude',
        )
        .is('deleted_at', null)
        .eq('active', true)
        .order('site_name'),
      sb
        .from('animals')
        .select('site_id')
        .eq('active', true)
        .is('deleted_at', null),
      sb.from('pens').select('site_id').is('deleted_at', null),
      sb
        .from('devices')
        .select('site_id, signal_status, active')
        .eq('active', true),
      // Cast to bypass typed client (see comment in getSitesKpis)
      (sb as unknown as UntypedClient)
        .from('environment_raw')
        .select(
          'site_id, ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
        )
        .gte('timestamp', since24h)
        .order('timestamp', { ascending: false }),
      sb
        .from('alerts')
        .select('site_id, severity, status')
        .eq('status', 'Open'),
    ]);

  const sites = sitesRes.data ?? [];
  const animalsCount = countByKey(animalsRes.data ?? [], 'site_id');
  const pensCount = countByKey(pensRes.data ?? [], 'site_id');

  const devicesOnline = new Map<string, number>();
  const devicesTotal = new Map<string, number>();
  for (const d of devicesRes.data ?? []) {
    if (!d.site_id) continue;
    devicesTotal.set(d.site_id, (devicesTotal.get(d.site_id) ?? 0) + 1);
    if (d.signal_status === 'online') {
      devicesOnline.set(d.site_id, (devicesOnline.get(d.site_id) ?? 0) + 1);
    }
  }

  // Group env readings by site, sorted desc by timestamp
  const envBySite = new Map<string, EnvRowKpi[]>();
  for (const r of (envRes.data ?? []) as EnvRowKpi[]) {
    if (!r.site_id) continue;
    const arr = envBySite.get(r.site_id) ?? [];
    arr.push(r);
    envBySite.set(r.site_id, arr);
  }

  const sevRank: Record<AlertSeverity, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  const alertsBySite = new Map<
    string,
    { count: number; criticals: number; highest: AlertSeverity }
  >();
  for (const a of alertsRes.data ?? []) {
    if (!a.site_id) continue;
    const cur = alertsBySite.get(a.site_id);
    const sev = a.severity as AlertSeverity;
    if (!cur) {
      alertsBySite.set(a.site_id, {
        count: 1,
        criticals: sev === 'Critical' ? 1 : 0,
        highest: sev,
      });
    } else {
      cur.count += 1;
      if (sev === 'Critical') cur.criticals += 1;
      if (sevRank[sev] > sevRank[cur.highest]) cur.highest = sev;
    }
  }

  return sites.map((s) => {
    const env = envBySite.get(s.id) ?? [];
    const latest = env[0] ?? null;

    // Compute hourly THI series
    const hourMap = new Map<string, { sum: number; count: number }>();
    for (const r of env) {
      if (!r.timestamp || r.thi === null) continue;
      const hour = new Date(r.timestamp).toISOString().slice(0, 13) + ':00:00Z';
      const cell = hourMap.get(hour) ?? { sum: 0, count: 0 };
      cell.sum += Number(r.thi);
      cell.count += 1;
      hourMap.set(hour, cell);
    }
    const thiSeries = Array.from(hourMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, { sum, count }]) => ({
        hour,
        avg: Math.round((sum / count) * 10) / 10,
      }));

    const currentThi = latest?.thi !== null && latest?.thi !== undefined
      ? Number(latest.thi)
      : null;

    const alertInfo = alertsBySite.get(s.id);

    return {
      id: s.id,
      site_name: s.site_name,
      location_address: s.location_address,
      manager_name: s.manager_name,
      manager_phone: s.manager_phone,
      timezone: s.timezone ?? 'UTC',
      latitude: s.latitude !== null ? Number(s.latitude) : null,
      longitude: s.longitude !== null ? Number(s.longitude) : null,

      animals_count: animalsCount.get(s.id) ?? 0,
      pens_count: pensCount.get(s.id) ?? 0,
      devices_online: devicesOnline.get(s.id) ?? 0,
      devices_total: devicesTotal.get(s.id) ?? 0,

      current_temp:
        latest?.ambient_temp_c !== null && latest?.ambient_temp_c !== undefined
          ? Number(latest.ambient_temp_c)
          : null,
      current_humidity:
        latest?.humidity_pct !== null && latest?.humidity_pct !== undefined
          ? Number(latest.humidity_pct)
          : null,
      current_thi: currentThi,
      current_ammonia:
        latest?.ammonia_ppm !== null && latest?.ammonia_ppm !== undefined
          ? Number(latest.ammonia_ppm)
          : null,
      current_ventilation:
        latest?.ventilation_score !== null &&
        latest?.ventilation_score !== undefined
          ? Number(latest.ventilation_score)
          : null,
      thi_category: currentThi !== null ? getThiCategory(currentThi) : null,
      last_reading_at: latest?.timestamp ?? null,

      thi_series_24h: thiSeries,

      open_alerts: alertInfo?.count ?? 0,
      critical_alerts: alertInfo?.criticals ?? 0,
      highest_severity: alertInfo?.highest ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Site detail (for drawer)
// ---------------------------------------------------------------------------

export async function getSiteDetail(
  id: string,
): Promise<SiteDetailData | null> {
  const sb = createClient();

  const { data: site } = await sb
    .from('sites')
    .select(
      'id, site_name, location_address, manager_name, manager_phone, timezone, latitude, longitude, notes',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!site) return null;

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    animalsRes,
    pensRes,
    devicesRes,
    envRes,
    alertsRes,
    kpiRes,
  ] = await Promise.all([
    sb
      .from('animals')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', id)
      .eq('active', true)
      .is('deleted_at', null),
    sb
      .from('pens')
      .select('id, pen_name, pen_type, capacity, current_animals')
      .eq('site_id', id)
      .is('deleted_at', null)
      .order('pen_name'),
    sb
      .from('devices')
      .select('signal_status, active')
      .eq('site_id', id),
    // Cast to bypass typed client (see comment in getSitesKpis)
    (sb as unknown as UntypedClient)
      .from('environment_raw')
      .select(
        'pen_id, ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
      )
      .eq('site_id', id)
      .gte('timestamp', since7d)
      .order('timestamp', { ascending: true }),
    sb
      .from('alerts')
      .select(
        'id, timestamp, severity, status, alert_type, short_message, recommended_action',
      )
      .eq('site_id', id)
      .eq('status', 'Open')
      .order('timestamp', { ascending: false })
      .limit(10),
    sb
      .from('kpi_overview')
      .select(
        'overall_status, animals_at_risk, environment_risk_index, devices_offline, devices_low_battery',
      )
      .eq('site_id', id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Bin env into 2hr buckets + compute hourly THI for sparkline
  const env = (envRes.data ?? []) as EnvRowDetail[];
  const bucketMap = new Map<
    string,
    {
      temps: number[];
      hums: number[];
      this_: number[];
      ams: number[];
      vents: number[];
    }
  >();
  const thiHourMap = new Map<string, { sum: number; count: number }>();

  for (const r of env) {
    if (!r.timestamp) continue;
    const d = new Date(r.timestamp);

    // 2hr bucket
    const bd = new Date(d);
    bd.setMinutes(0, 0, 0);
    bd.setHours(bd.getHours() - (bd.getHours() % 2));
    const bKey = bd.toISOString();
    const cell = bucketMap.get(bKey) ?? {
      temps: [],
      hums: [],
      this_: [],
      ams: [],
      vents: [],
    };
    if (Number.isFinite(Number(r.ambient_temp_c)))
      cell.temps.push(Number(r.ambient_temp_c));
    if (Number.isFinite(Number(r.humidity_pct)))
      cell.hums.push(Number(r.humidity_pct));
    if (Number.isFinite(Number(r.thi))) cell.this_.push(Number(r.thi));
    if (Number.isFinite(Number(r.ammonia_ppm)))
      cell.ams.push(Number(r.ammonia_ppm));
    if (Number.isFinite(Number(r.ventilation_score)))
      cell.vents.push(Number(r.ventilation_score));
    bucketMap.set(bKey, cell);

    // Hourly THI for the 24h sparkline
    const since24h = Date.now() - 24 * 60 * 60 * 1000;
    if (d.getTime() >= since24h && r.thi !== null) {
      const hKey = d.toISOString().slice(0, 13) + ':00:00Z';
      const hCell = thiHourMap.get(hKey) ?? { sum: 0, count: 0 };
      hCell.sum += Number(r.thi);
      hCell.count += 1;
      thiHourMap.set(hKey, hCell);
    }
  }

  const series_7d = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, c]) => ({
      bucket,
      temp: c.temps.length ? round1(mean(c.temps)) : null,
      humidity: c.hums.length ? round1(mean(c.hums)) : null,
      thi: c.this_.length ? round1(mean(c.this_)) : null,
      ammonia: c.ams.length ? round1(mean(c.ams)) : null,
      ventilation: c.vents.length ? round1(mean(c.vents)) : null,
    }));

  const thi_series_24h = Array.from(thiHourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, { sum, count }]) => ({
      hour,
      avg: Math.round((sum / count) * 10) / 10,
    }));

  // Latest environment per pen (for the Pens tab)
  const latestPerPen = new Map<
    string,
    {
      ambient_temp_c: number | null;
      humidity_pct: number | null;
      thi: number | null;
      ammonia_ppm: number | null;
      timestamp: string;
    }
  >();
  for (let i = env.length - 1; i >= 0; i--) {
    const r = env[i]!;
    if (!r.pen_id) continue;
    if (latestPerPen.has(r.pen_id)) continue;
    latestPerPen.set(r.pen_id, {
      ambient_temp_c:
        r.ambient_temp_c !== null ? Number(r.ambient_temp_c) : null,
      humidity_pct: r.humidity_pct !== null ? Number(r.humidity_pct) : null,
      thi: r.thi !== null ? Number(r.thi) : null,
      ammonia_ppm: r.ammonia_ppm !== null ? Number(r.ammonia_ppm) : null,
      timestamp: r.timestamp,
    });
  }

  const pens = (pensRes.data ?? []).map((p) => {
    const latest = latestPerPen.get(p.id);
    return {
      id: p.id,
      pen_name: p.pen_name,
      pen_type: p.pen_type as string,
      capacity: p.capacity,
      current_animals: p.current_animals,
      last_temp: latest?.ambient_temp_c ?? null,
      last_humidity: latest?.humidity_pct ?? null,
      last_thi: latest?.thi ?? null,
      last_ammonia: latest?.ammonia_ppm ?? null,
      last_reading_at: latest?.timestamp ?? null,
    };
  });

  // Compute current readings (same as grid logic)
  // Use the most recent env reading for the site
  const lastEnv = env[env.length - 1] ?? null;
  const currentThi = lastEnv?.thi !== null && lastEnv?.thi !== undefined
    ? Number(lastEnv.thi)
    : null;

  // Devices
  let devicesOnline = 0;
  let devicesTotal = 0;
  for (const d of devicesRes.data ?? []) {
    if (!d.active) continue;
    devicesTotal += 1;
    if (d.signal_status === 'online') devicesOnline += 1;
  }

  // Alerts
  const alerts = alertsRes.data ?? [];
  const sevRank: Record<AlertSeverity, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  let openCount = 0;
  let criticalCount = 0;
  let highest: AlertSeverity | null = null;
  for (const a of alerts) {
    openCount += 1;
    const sev = a.severity as AlertSeverity;
    if (sev === 'Critical') criticalCount += 1;
    if (!highest || sevRank[sev] > sevRank[highest]) highest = sev;
  }

  return {
    id: site.id,
    site_name: site.site_name,
    location_address: site.location_address,
    manager_name: site.manager_name,
    manager_phone: site.manager_phone,
    timezone: site.timezone ?? 'UTC',
    latitude: site.latitude !== null ? Number(site.latitude) : null,
    longitude: site.longitude !== null ? Number(site.longitude) : null,
    notes: site.notes,

    animals_count: animalsRes.count ?? 0,
    pens_count: pens.length,
    devices_online: devicesOnline,
    devices_total: devicesTotal,

    current_temp:
      lastEnv?.ambient_temp_c !== null && lastEnv?.ambient_temp_c !== undefined
        ? Number(lastEnv.ambient_temp_c)
        : null,
    current_humidity:
      lastEnv?.humidity_pct !== null && lastEnv?.humidity_pct !== undefined
        ? Number(lastEnv.humidity_pct)
        : null,
    current_thi: currentThi,
    current_ammonia:
      lastEnv?.ammonia_ppm !== null && lastEnv?.ammonia_ppm !== undefined
        ? Number(lastEnv.ammonia_ppm)
        : null,
    current_ventilation:
      lastEnv?.ventilation_score !== null &&
      lastEnv?.ventilation_score !== undefined
        ? Number(lastEnv.ventilation_score)
        : null,
    thi_category: currentThi !== null ? getThiCategory(currentThi) : null,
    last_reading_at: lastEnv?.timestamp ?? null,

    thi_series_24h,
    series_7d,
    pens,

    open_alerts: openCount,
    critical_alerts: criticalCount,
    highest_severity: highest,

    recent_alerts: alerts
      .filter(
        (a): a is typeof a & { timestamp: string } => a.timestamp !== null,
      )
      .map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        severity: a.severity as AlertSeverity,
        status: a.status as string,
        alert_type: a.alert_type,
        short_message: a.short_message,
        recommended_action: a.recommended_action,
      })),

    kpi: kpiRes.data
      ? {
          overall_status: (kpiRes.data.overall_status as string | null) ?? null,
          animals_at_risk: kpiRes.data.animals_at_risk,
          environment_risk_index: kpiRes.data.environment_risk_index !== null
            ? Number(kpiRes.data.environment_risk_index)
            : null,
          devices_offline: kpiRes.data.devices_offline,
          devices_low_battery: kpiRes.data.devices_low_battery,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countByKey<T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of arr) {
    const k = r[key] as string | null;
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function mean(xs: number[]): number {
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Re-export ThiCategory so consumers can import everything from this module
export type { ThiCategory };
