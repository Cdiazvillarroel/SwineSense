import 'server-only';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const HEALTH_STATUSES = [
  'healthy',
  'monitoring',
  'sick',
  'recovering',
  'deceased',
] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

function isHealthStatus(v: string): v is HealthStatus {
  return (HEALTH_STATUSES as readonly string[]).includes(v);
}

export interface AnimalsKpis {
  herd: {
    total: number;
    by_pen_type: { pen_type: string; count: number }[];
  };
  temperature: {
    avg: number | null;
    min: number | null;
    max: number | null;
    high_count: number; // > 39.5
    distribution_24h: { bucket: string; count: number }[];
  };
  activity: {
    avg: number | null;
    low_count: number; // < 60
    series_24h: { hour: string; avg: number }[];
  };
  alerts: {
    total_open: number;
    animals_affected: number;
    by_severity: { severity: AlertSeverity; count: number }[];
  };
}

export interface AnimalRow {
  id: string;
  tag_number: string;
  sex: string | null;
  breed: string | null;
  weight_kg: number | null;
  health_status: HealthStatus | null;
  pen_id: string | null;
  pen_name: string | null;
  pen_type: string | null;
  site_id: string | null;
  site_name: string | null;
  last_reading_at: string | null;
  last_temp: number | null;
  last_activity: number | null;
  open_alert_count: number;
  highest_severity: AlertSeverity | null;
}

export interface AnimalListFilters {
  site?: string;
  pen_type?: string;
  health?: string;
  has_alerts?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AnimalDetail {
  animal: {
    id: string;
    tag_number: string;
    sex: string | null;
    breed: string | null;
    birth_date: string | null;
    weight_kg: number | null;
    health_status: HealthStatus | null;
    pen_name: string | null;
    pen_type: string | null;
    site_name: string | null;
    site_id: string | null;
  };
  device: {
    serial_number: string | null;
    model: string | null;
    battery_status: number | null;
    signal_status: string | null;
    last_seen: string | null;
  } | null;
  last_reading: {
    timestamp: string;
    body_temp_c: number | null;
    activity: number | null;
    feed_intake_g: number | null;
    water_intake_ml: number | null;
    feed_visits: number | null;
  } | null;
  series_7d: {
    bucket: string;
    body_temp_c: number | null;
    activity: number | null;
    feed_intake_g: number | null;
    water_intake_ml: number | null;
  }[];
  open_alerts: {
    id: string;
    timestamp: string;
    severity: AlertSeverity;
    alert_type: string;
    short_message: string | null;
    recommended_action: string | null;
  }[];
}

// ---------------------------------------------------------------------------
// 1. KPIs (group-level overview)
// ---------------------------------------------------------------------------

export async function getAnimalsKpis(): Promise<AnimalsKpis> {
  const sb = createClient();

  // 1a. Herd summary — animals grouped by pen_type
  const { data: animalsForHerd } = await sb
    .from('animals')
    .select('pen_id')
    .eq('active', true)
    .is('deleted_at', null);

  const allAnimals = animalsForHerd ?? [];
  const penIds = Array.from(
    new Set(allAnimals.map((a) => a.pen_id).filter((v): v is string => !!v)),
  );
  const { data: pensForHerd } = penIds.length
    ? await sb.from('pens').select('id, pen_type').in('id', penIds)
    : { data: [] as { id: string; pen_type: string }[] };

  const penTypeMap = new Map<string, string>(
    (pensForHerd ?? []).map((p) => [p.id, p.pen_type]),
  );
  const herdCounts = new Map<string, number>();
  for (const a of allAnimals) {
    const pt = a.pen_id ? penTypeMap.get(a.pen_id) ?? 'unknown' : 'unknown';
    herdCounts.set(pt, (herdCounts.get(pt) ?? 0) + 1);
  }
  const byPenType = Array.from(herdCounts.entries())
    .map(([pen_type, count]) => ({ pen_type, count }))
    .sort((a, b) => b.count - a.count);

  // 1b. Telemetry stats from the last 24h
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: telemetry } = await sb
    .from('telemetry_raw')
    .select('animal_id, body_temp_c, activity, timestamp')
    .gte('timestamp', since24h);

  const telemetryRows = telemetry ?? [];
  const temps = telemetryRows
    .map((r) => Number(r.body_temp_c))
    .filter((n) => Number.isFinite(n));
  const acts = telemetryRows
    .map((r) => Number(r.activity))
    .filter((n) => Number.isFinite(n));

  const avgTemp = temps.length
    ? Math.round((temps.reduce((s, n) => s + n, 0) / temps.length) * 100) / 100
    : null;
  const avgActivity = acts.length
    ? Math.round((acts.reduce((s, n) => s + n, 0) / acts.length) * 10) / 10
    : null;

  // Temperature histogram: 0.2°C buckets from 37.0 to 41.0
  const bucketEdges: number[] = [];
  for (let t = 37.0; t <= 41.0 + 0.0001; t += 0.2) {
    bucketEdges.push(Math.round(t * 10) / 10);
  }
  const tempBuckets = new Map<string, number>(
    bucketEdges.map((e) => [e.toFixed(1), 0]),
  );
  for (const t of temps) {
    const idx = Math.max(
      0,
      Math.min(bucketEdges.length - 1, Math.floor((t - 37.0) / 0.2)),
    );
    // idx is mathematically guaranteed to be in [0, bucketEdges.length-1]
    const edge = bucketEdges[idx]!;
    const key = edge.toFixed(1);
    tempBuckets.set(key, (tempBuckets.get(key) ?? 0) + 1);
  }

  // Activity hourly series for sparkline
  const hourMap = new Map<string, { sum: number; count: number }>();
  for (const r of telemetryRows) {
    if (!r.timestamp) continue;
    const a = Number(r.activity);
    if (!Number.isFinite(a)) continue;
    const hour = new Date(r.timestamp).toISOString().slice(0, 13) + ':00:00Z';
    const cell = hourMap.get(hour) ?? { sum: 0, count: 0 };
    cell.sum += a;
    cell.count += 1;
    hourMap.set(hour, cell);
  }
  const activitySeries = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, { sum, count }]) => ({
      hour,
      avg: Math.round((sum / count) * 10) / 10,
    }));

  // 1c. Alerts summary
  const { data: alertsData } = await sb
    .from('alerts')
    .select('animal_id, severity')
    .eq('status', 'Open')
    .not('animal_id', 'is', null);

  const alertRows = alertsData ?? [];
  const animalsAffected = new Set(alertRows.map((r) => r.animal_id));
  const sevCounts = new Map<AlertSeverity, number>([
    ['Critical', 0],
    ['High', 0],
    ['Medium', 0],
    ['Low', 0],
  ]);
  for (const r of alertRows) {
    const sev = r.severity as AlertSeverity;
    sevCounts.set(sev, (sevCounts.get(sev) ?? 0) + 1);
  }

  return {
    herd: {
      total: allAnimals.length,
      by_pen_type: byPenType,
    },
    temperature: {
      avg: avgTemp,
      min: temps.length ? Math.min(...temps) : null,
      max: temps.length ? Math.max(...temps) : null,
      high_count: temps.filter((t) => t > 39.5).length,
      distribution_24h: Array.from(tempBuckets.entries()).map(
        ([bucket, count]) => ({ bucket, count }),
      ),
    },
    activity: {
      avg: avgActivity,
      low_count: acts.filter((a) => a < 60).length,
      series_24h: activitySeries,
    },
    alerts: {
      total_open: alertRows.length,
      animals_affected: animalsAffected.size,
      by_severity: Array.from(sevCounts.entries()).map(([severity, count]) => ({
        severity,
        count,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. List with latest reading + alert badge
// ---------------------------------------------------------------------------

export async function getAnimalsList(filters: AnimalListFilters) {
  const sb = createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.page_size ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [sitesRes, pensRes] = await Promise.all([
    sb
      .from('sites')
      .select('id, site_name')
      .is('deleted_at', null)
      .order('site_name'),
    sb
      .from('pens')
      .select('id, pen_name, pen_type, site_id')
      .is('deleted_at', null),
  ]);
  const sites = sitesRes.data ?? [];
  const pens = pensRes.data ?? [];
  const sitesMap = new Map(sites.map((s) => [s.id, s]));
  const pensMap = new Map(pens.map((p) => [p.id, p]));

  let q = sb
    .from('animals')
    .select(
      'id, tag_number, sex, breed, weight_kg, health_status, pen_id, site_id, active',
      { count: 'exact' },
    )
    .eq('active', true)
    .is('deleted_at', null)
    .order('tag_number');

  if (filters.site && sitesMap.has(filters.site)) {
    q = q.eq('site_id', filters.site);
  }
  if (filters.health && isHealthStatus(filters.health)) {
    q = q.eq('health_status', filters.health);
  }
  if (filters.search) {
    q = q.ilike('tag_number', `%${filters.search}%`);
  }
  if (filters.pen_type) {
    const penIdsOfType = pens
      .filter((p) => p.pen_type === filters.pen_type)
      .map((p) => p.id);
    if (penIdsOfType.length === 0) {
      return {
        sites,
        rows: [] as AnimalRow[],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }
    q = q.in('pen_id', penIdsOfType);
  }

  const animalsRes = await q.range(from, to);
  const animals = animalsRes.data ?? [];
  const total = animalsRes.count ?? 0;

  if (animals.length === 0) {
    return { sites, rows: [], total, page, pageSize, totalPages: 1 };
  }

  const animalIds = animals.map((a) => a.id);

  const { data: recentReadings } = await sb
    .from('telemetry_raw')
    .select('animal_id, body_temp_c, activity, timestamp')
    .in('animal_id', animalIds)
    .gte(
      'timestamp',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .order('timestamp', { ascending: false });

  const latestByAnimal = new Map<
    string,
    { timestamp: string; body_temp_c: number | null; activity: number | null }
  >();
  for (const r of recentReadings ?? []) {
    if (!r.animal_id || latestByAnimal.has(r.animal_id)) continue;
    latestByAnimal.set(r.animal_id, {
      timestamp: r.timestamp,
      body_temp_c: r.body_temp_c,
      activity: r.activity,
    });
  }

  const { data: alerts } = await sb
    .from('alerts')
    .select('animal_id, severity')
    .eq('status', 'Open')
    .in('animal_id', animalIds);

  const sevRank: Record<AlertSeverity, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  const alertsByAnimal = new Map<
    string,
    { count: number; highest: AlertSeverity }
  >();
  for (const a of alerts ?? []) {
    if (!a.animal_id) continue;
    const cur = alertsByAnimal.get(a.animal_id);
    const sev = a.severity as AlertSeverity;
    if (!cur) {
      alertsByAnimal.set(a.animal_id, { count: 1, highest: sev });
    } else {
      cur.count += 1;
      if (sevRank[sev] > sevRank[cur.highest]) cur.highest = sev;
    }
  }

  let filteredAnimals = animals;
  if (filters.has_alerts) {
    filteredAnimals = animals.filter((a) => alertsByAnimal.has(a.id));
  }

  const rows: AnimalRow[] = filteredAnimals.map((a) => {
    const pen = a.pen_id ? pensMap.get(a.pen_id) : undefined;
    const site = a.site_id ? sitesMap.get(a.site_id) : undefined;
    const latest = latestByAnimal.get(a.id);
    const alertInfo = alertsByAnimal.get(a.id);
    return {
      id: a.id,
      tag_number: a.tag_number,
      sex: a.sex,
      breed: a.breed,
      weight_kg: a.weight_kg,
      health_status: a.health_status as HealthStatus | null,
      pen_id: a.pen_id,
      pen_name: pen?.pen_name ?? null,
      pen_type: pen?.pen_type ?? null,
      site_id: a.site_id,
      site_name: site?.site_name ?? null,
      last_reading_at: latest?.timestamp ?? null,
      last_temp:
        latest?.body_temp_c !== undefined && latest?.body_temp_c !== null
          ? Number(latest.body_temp_c)
          : null,
      last_activity:
        latest?.activity !== undefined && latest?.activity !== null
          ? Number(latest.activity)
          : null,
      open_alert_count: alertInfo?.count ?? 0,
      highest_severity: alertInfo?.highest ?? null,
    };
  });

  return {
    sites,
    rows,
    total: filters.has_alerts ? rows.length : total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// 3. Individual animal detail (for drawer)
// ---------------------------------------------------------------------------

export async function getAnimalDetail(
  id: string,
): Promise<AnimalDetail | null> {
  const sb = createClient();

  const { data: animal } = await sb
    .from('animals')
    .select(
      'id, tag_number, sex, breed, birth_date, weight_kg, health_status, pen_id, site_id, device_id',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!animal) return null;

  const [penRes, siteRes, deviceRes, readingsRes, alertsRes] =
    await Promise.all([
      animal.pen_id
        ? sb
            .from('pens')
            .select('pen_name, pen_type')
            .eq('id', animal.pen_id)
            .maybeSingle()
        : Promise.resolve({
            data: null as { pen_name: string; pen_type: string } | null,
          }),
      animal.site_id
        ? sb
            .from('sites')
            .select('site_name')
            .eq('id', animal.site_id)
            .maybeSingle()
        : Promise.resolve({ data: null as { site_name: string } | null }),
      animal.device_id
        ? sb
            .from('devices')
            .select(
              'serial_number, model, battery_status, signal_status, last_seen',
            )
            .eq('id', animal.device_id)
            .maybeSingle()
        : Promise.resolve({
            data: null as {
              serial_number: string;
              model: string | null;
              battery_status: number | null;
              signal_status: string | null;
              last_seen: string | null;
            } | null,
          }),
      sb
        .from('telemetry_raw')
        .select(
          'timestamp, body_temp_c, activity, feed_intake_g, water_intake_ml, feed_visits',
        )
        .eq('animal_id', id)
        .gte(
          'timestamp',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('timestamp', { ascending: true }),
      sb
        .from('alerts')
        .select(
          'id, timestamp, severity, alert_type, short_message, recommended_action, status',
        )
        .eq('animal_id', id)
        .eq('status', 'Open')
        .order('timestamp', { ascending: false }),
    ]);

  const readings = readingsRes.data ?? [];
  const lastReading = readings.length ? readings[readings.length - 1] : null;

  // Bin readings into 2hr buckets (matches SmartEarTag cycle)
  const bucketMap = new Map<
    string,
    { temps: number[]; acts: number[]; feeds: number[]; waters: number[] }
  >();
  for (const r of readings) {
    if (!r.timestamp) continue;
    const d = new Date(r.timestamp);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - (d.getHours() % 2));
    const key = d.toISOString();
    const cell = bucketMap.get(key) ?? {
      temps: [],
      acts: [],
      feeds: [],
      waters: [],
    };
    if (Number.isFinite(Number(r.body_temp_c)))
      cell.temps.push(Number(r.body_temp_c));
    if (Number.isFinite(Number(r.activity)))
      cell.acts.push(Number(r.activity));
    if (Number.isFinite(Number(r.feed_intake_g)))
      cell.feeds.push(Number(r.feed_intake_g));
    if (Number.isFinite(Number(r.water_intake_ml)))
      cell.waters.push(Number(r.water_intake_ml));
    bucketMap.set(key, cell);
  }
  const series_7d = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, c]) => ({
      bucket,
      body_temp_c: c.temps.length
        ? Math.round((c.temps.reduce((s, n) => s + n, 0) / c.temps.length) * 100) /
          100
        : null,
      activity: c.acts.length
        ? Math.round((c.acts.reduce((s, n) => s + n, 0) / c.acts.length) * 10) /
          10
        : null,
      feed_intake_g: c.feeds.length
        ? Math.round((c.feeds.reduce((s, n) => s + n, 0) / c.feeds.length) * 10) /
          10
        : null,
      water_intake_ml: c.waters.length
        ? Math.round((c.waters.reduce((s, n) => s + n, 0) / c.waters.length) * 10) /
          10
        : null,
    }));

  return {
    animal: {
      id: animal.id,
      tag_number: animal.tag_number,
      sex: animal.sex,
      breed: animal.breed,
      birth_date: animal.birth_date,
      weight_kg: animal.weight_kg,
      health_status: animal.health_status as HealthStatus | null,
      pen_name: penRes.data?.pen_name ?? null,
      pen_type: penRes.data?.pen_type ?? null,
      site_name: siteRes.data?.site_name ?? null,
      site_id: animal.site_id,
    },
    device: deviceRes.data
      ? {
          serial_number: deviceRes.data.serial_number,
          model: deviceRes.data.model,
          battery_status: deviceRes.data.battery_status,
          signal_status: deviceRes.data.signal_status,
          last_seen: deviceRes.data.last_seen,
        }
      : null,
    last_reading: lastReading
      ? {
          timestamp: lastReading.timestamp,
          body_temp_c: lastReading.body_temp_c,
          activity: lastReading.activity,
          feed_intake_g: lastReading.feed_intake_g,
          water_intake_ml: lastReading.water_intake_ml,
          feed_visits: lastReading.feed_visits,
        }
      : null,
    series_7d,
    open_alerts: (alertsRes.data ?? [])
      .filter(
        (a): a is typeof a & { timestamp: string } => a.timestamp !== null,
      )
      .map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        severity: a.severity as AlertSeverity,
        alert_type: a.alert_type,
        short_message: a.short_message,
        recommended_action: a.recommended_action,
      })),
  };
}
