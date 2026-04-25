import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getThiCategory, type ThiCategory } from '@/lib/weather';

/**
 * Pens repository.
 *
 * Three entry points:
 *   - getPensKpis()        → fleet-level KPI cards (top of /pens page)
 *   - getPensGrid(filters) → list of pen cards with current readings
 *   - getPenDetail(id)     → individual pen drawer (overview + climate + animals + alerts)
 *
 * All queries respect Row Level Security.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type PenType =
  | 'gestation'
  | 'farrowing'
  | 'nursery'
  | 'grower'
  | 'finisher'
  | 'boar'
  | 'isolation';

export interface PensKpis {
  fleet: {
    total_pens: number;
    total_capacity: number;
    total_current: number;
    by_pen_type: { pen_type: string; count: number }[];
  };
  thi: {
    avg_24h: number | null;
    max_24h: number | null;
    by_pen_type: { pen_type: string; avg_thi: number; category: ThiCategory }[];
    pens_in_alert: number;
  };
  air: {
    avg_ammonia_24h: number | null;
    avg_ventilation_24h: number | null;
    concerning_readings: number;
    by_ventilation_type: { ventilation_type: string; avg_nh3: number }[];
  };
  alerts: {
    total_open: number;
    pens_affected: number;
    by_severity: { severity: AlertSeverity; count: number }[];
  };
}

export interface PenCardData {
  id: string;
  pen_name: string;
  pen_type: string;
  capacity: number | null;
  current_animals: number | null;
  ventilation_type: string | null;
  water_source: string | null;
  feed_type: string | null;
  site_id: string;
  site_name: string;

  animals_active: number;
  devices_total: number;
  devices_online: number;

  current_temp: number | null;
  current_humidity: number | null;
  current_thi: number | null;
  current_ammonia: number | null;
  current_ventilation: number | null;
  thi_category: ThiCategory | null;
  last_reading_at: string | null;

  avg_body_temp_24h: number | null;
  avg_activity_24h: number | null;

  thi_series_24h: { hour: string; avg: number }[];

  open_alerts: number;
  critical_alerts: number;
  highest_severity: AlertSeverity | null;
}

export interface PenAnimal {
  id: string;
  tag_number: string;
  health_status: string | null;
  weight_kg: number | null;
  last_temp: number | null;
  last_activity: number | null;
  last_reading_at: string | null;
  open_alerts: number;
}

export interface PenDetailData extends PenCardData {
  notes: string | null;
  series_7d: {
    bucket: string;
    temp: number | null;
    humidity: number | null;
    thi: number | null;
    ammonia: number | null;
    ventilation: number | null;
  }[];
  animals: PenAnimal[];
  recent_alerts: {
    id: string;
    timestamp: string;
    severity: AlertSeverity;
    status: string;
    alert_type: string;
    short_message: string | null;
    recommended_action: string | null;
    ai_insight: string | null;
  }[];
}

export interface PenListFilters {
  site?: string;
  pen_type?: string;
  ventilation_type?: string;
  has_alerts?: boolean;
}

const PEN_TYPES_VALID: readonly string[] = [
  'gestation',
  'farrowing',
  'nursery',
  'grower',
  'finisher',
  'boar',
  'isolation',
];

// ---------------------------------------------------------------------------
// 1. Fleet-level KPIs
// ---------------------------------------------------------------------------

export async function getPensKpis(): Promise<PensKpis> {
  const sb = createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [pensRes, envRes, alertsRes] = await Promise.all([
    sb
      .from('pens')
      .select('id, pen_type, capacity, current_animals, ventilation_type')
      .eq('active', true)
      .is('deleted_at', null),
    sb
      .from('environment_raw')
      .select(
        'pen_id, ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
      )
      .gte('timestamp', since24h),
    sb
      .from('alerts')
      .select('pen_id, severity, status')
      .eq('status', 'Open')
      .not('pen_id', 'is', null),
  ]);

  const pens = pensRes.data ?? [];
  const env = envRes.data ?? [];
  const alerts = alertsRes.data ?? [];

  // Pen type → ventilation_type lookup
  const penInfo = new Map<
    string,
    { pen_type: string; ventilation_type: string | null }
  >();
  for (const p of pens) {
    penInfo.set(p.id, {
      pen_type: p.pen_type as string,
      ventilation_type: p.ventilation_type,
    });
  }

  // Counts by pen_type
  const penTypeCounts = new Map<string, number>();
  let totalCapacity = 0;
  let totalCurrent = 0;
  for (const p of pens) {
    penTypeCounts.set(
      p.pen_type as string,
      (penTypeCounts.get(p.pen_type as string) ?? 0) + 1,
    );
    totalCapacity += p.capacity ?? 0;
    totalCurrent += p.current_animals ?? 0;
  }

  // THI aggregates
  const thiVals = env
    .map((r) => Number(r.thi))
    .filter((n) => Number.isFinite(n));
  const ammoniaVals = env
    .map((r) => Number(r.ammonia_ppm))
    .filter((n) => Number.isFinite(n));
  const ventVals = env
    .map((r) => Number(r.ventilation_score))
    .filter((n) => Number.isFinite(n));

  const avg = (xs: number[]) =>
    xs.length
      ? Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10
      : null;

  // THI by pen_type
  const thiByPenType = new Map<string, number[]>();
  for (const r of env) {
    if (!r.pen_id || r.thi === null) continue;
    const info = penInfo.get(r.pen_id);
    if (!info) continue;
    const arr = thiByPenType.get(info.pen_type) ?? [];
    arr.push(Number(r.thi));
    thiByPenType.set(info.pen_type, arr);
  }
  const thiByPenTypeRows = Array.from(thiByPenType.entries())
    .map(([pen_type, vals]) => {
      const avgThi = vals.reduce((s, n) => s + n, 0) / vals.length;
      return {
        pen_type,
        avg_thi: Math.round(avgThi * 10) / 10,
        category: getThiCategory(avgThi),
      };
    })
    .sort((a, b) => b.avg_thi - a.avg_thi);

  // Ammonia by ventilation_type
  const nh3ByVent = new Map<string, number[]>();
  for (const r of env) {
    if (!r.pen_id || r.ammonia_ppm === null) continue;
    const info = penInfo.get(r.pen_id);
    if (!info || !info.ventilation_type) continue;
    const arr = nh3ByVent.get(info.ventilation_type) ?? [];
    arr.push(Number(r.ammonia_ppm));
    nh3ByVent.set(info.ventilation_type, arr);
  }
  const nh3ByVentRows = Array.from(nh3ByVent.entries())
    .map(([ventilation_type, vals]) => ({
      ventilation_type,
      avg_nh3:
        Math.round(
          (vals.reduce((s, n) => s + n, 0) / vals.length) * 10,
        ) / 10,
    }))
    .sort((a, b) => b.avg_nh3 - a.avg_nh3);

  // Pens in THI alert (avg > 74 → at least alert level)
  const pensInAlert = new Set<string>();
  const thiByPen = new Map<string, number[]>();
  for (const r of env) {
    if (!r.pen_id || r.thi === null) continue;
    const arr = thiByPen.get(r.pen_id) ?? [];
    arr.push(Number(r.thi));
    thiByPen.set(r.pen_id, arr);
  }
  for (const [penId, vals] of thiByPen) {
    const avgThi = vals.reduce((s, n) => s + n, 0) / vals.length;
    if (avgThi >= 74) pensInAlert.add(penId);
  }

  // Alerts
  const sevCounts = new Map<AlertSeverity, number>([
    ['Critical', 0],
    ['High', 0],
    ['Medium', 0],
    ['Low', 0],
  ]);
  const pensAffected = new Set<string>();
  for (const a of alerts) {
    const sev = a.severity as AlertSeverity;
    sevCounts.set(sev, (sevCounts.get(sev) ?? 0) + 1);
    if (a.pen_id) pensAffected.add(a.pen_id);
  }

  return {
    fleet: {
      total_pens: pens.length,
      total_capacity: totalCapacity,
      total_current: totalCurrent,
      by_pen_type: Array.from(penTypeCounts.entries())
        .map(([pen_type, count]) => ({ pen_type, count }))
        .sort((a, b) => b.count - a.count),
    },
    thi: {
      avg_24h: avg(thiVals),
      max_24h: thiVals.length ? Math.max(...thiVals) : null,
      by_pen_type: thiByPenTypeRows,
      pens_in_alert: pensInAlert.size,
    },
    air: {
      avg_ammonia_24h: avg(ammoniaVals),
      avg_ventilation_24h: avg(ventVals),
      concerning_readings: ammoniaVals.filter((a) => a > 25).length,
      by_ventilation_type: nh3ByVentRows,
    },
    alerts: {
      total_open: alerts.length,
      pens_affected: pensAffected.size,
      by_severity: Array.from(sevCounts.entries()).map(([severity, count]) => ({
        severity,
        count,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Grid — list of pen cards with current readings
// ---------------------------------------------------------------------------

export async function getPensGrid(
  filters: PenListFilters,
): Promise<{ pens: PenCardData[]; sites: { id: string; site_name: string }[] }> {
  const sb = createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [sitesRes, pensRes] = await Promise.all([
    sb
      .from('sites')
      .select('id, site_name')
      .is('deleted_at', null)
      .order('site_name'),
    sb
      .from('pens')
      .select(
        'id, pen_name, pen_type, capacity, current_animals, ventilation_type, water_source, feed_type, site_id',
      )
      .eq('active', true)
      .is('deleted_at', null)
      .order('pen_name'),
  ]);

  const sites = sitesRes.data ?? [];
  const sitesMap = new Map(sites.map((s) => [s.id, s.site_name]));

  // Apply filters
  let pens = pensRes.data ?? [];
  if (filters.site) {
    pens = pens.filter((p) => p.site_id === filters.site);
  }
  if (filters.pen_type && PEN_TYPES_VALID.includes(filters.pen_type)) {
    pens = pens.filter((p) => p.pen_type === filters.pen_type);
  }
  if (filters.ventilation_type) {
    pens = pens.filter((p) => p.ventilation_type === filters.ventilation_type);
  }

  if (pens.length === 0) {
    return { pens: [], sites };
  }

  const penIds = pens.map((p) => p.id);

  // Parallel: animals, devices, env readings, alerts, telemetry
  const [
    animalsRes,
    devicesRes,
    envRes,
    alertsRes,
    telemetryRes,
  ] = await Promise.all([
    sb
      .from('animals')
      .select('pen_id')
      .eq('active', true)
      .is('deleted_at', null)
      .in('pen_id', penIds),
    sb
      .from('devices')
      .select('pen_id, signal_status, active')
      .eq('active', true)
      .in('pen_id', penIds),
    sb
      .from('environment_raw')
      .select(
        'pen_id, ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
      )
      .in('pen_id', penIds)
      .gte('timestamp', since24h)
      .order('timestamp', { ascending: false }),
    sb
      .from('alerts')
      .select('pen_id, severity, status')
      .eq('status', 'Open')
      .in('pen_id', penIds),
    sb
      .from('telemetry_raw')
      .select('pen_id, body_temp_c, activity, timestamp')
      .in('pen_id', penIds)
      .gte('timestamp', since24h),
  ]);

  // Animals per pen
  const animalsCount = new Map<string, number>();
  for (const a of animalsRes.data ?? []) {
    if (!a.pen_id) continue;
    animalsCount.set(a.pen_id, (animalsCount.get(a.pen_id) ?? 0) + 1);
  }

  // Devices per pen
  const devicesOnline = new Map<string, number>();
  const devicesTotal = new Map<string, number>();
  for (const d of devicesRes.data ?? []) {
    if (!d.pen_id) continue;
    devicesTotal.set(d.pen_id, (devicesTotal.get(d.pen_id) ?? 0) + 1);
    if (d.signal_status === 'online') {
      devicesOnline.set(d.pen_id, (devicesOnline.get(d.pen_id) ?? 0) + 1);
    }
  }

  // Group env readings per pen (already sorted desc by timestamp)
  type EnvReading = {
    pen_id: string | null;
    ambient_temp_c: number | null;
    humidity_pct: number | null;
    thi: number | null;
    ammonia_ppm: number | null;
    ventilation_score: number | null;
    timestamp: string;
  };
  const envByPen = new Map<string, EnvReading[]>();
  for (const r of (envRes.data ?? []) as EnvReading[]) {
    if (!r.pen_id) continue;
    const arr = envByPen.get(r.pen_id) ?? [];
    arr.push(r);
    envByPen.set(r.pen_id, arr);
  }

  // Telemetry aggregates per pen (avg body temp + activity)
  const telemetryByPen = new Map<
    string,
    { temps: number[]; acts: number[] }
  >();
  for (const t of telemetryRes.data ?? []) {
    if (!t.pen_id) continue;
    const cell = telemetryByPen.get(t.pen_id) ?? { temps: [], acts: [] };
    if (Number.isFinite(Number(t.body_temp_c)))
      cell.temps.push(Number(t.body_temp_c));
    if (Number.isFinite(Number(t.activity))) cell.acts.push(Number(t.activity));
    telemetryByPen.set(t.pen_id, cell);
  }

  // Alerts per pen
  const sevRank: Record<AlertSeverity, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };
  const alertsByPen = new Map<
    string,
    { count: number; criticals: number; highest: AlertSeverity }
  >();
  for (const a of alertsRes.data ?? []) {
    if (!a.pen_id) continue;
    const cur = alertsByPen.get(a.pen_id);
    const sev = a.severity as AlertSeverity;
    if (!cur) {
      alertsByPen.set(a.pen_id, {
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

  // Build pen rows
  let penRows: PenCardData[] = pens.map((p) => {
    const env = envByPen.get(p.id) ?? [];
    const latest = env[0] ?? null;
    const tele = telemetryByPen.get(p.id);

    // Hourly THI series for sparkline
    const hourMap = new Map<string, { sum: number; count: number }>();
    for (const r of env) {
      if (r.thi === null) continue;
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

    const currentThi =
      latest?.thi !== null && latest?.thi !== undefined
        ? Number(latest.thi)
        : null;

    const alertInfo = alertsByPen.get(p.id);

    return {
      id: p.id,
      pen_name: p.pen_name,
      pen_type: p.pen_type as string,
      capacity: p.capacity,
      current_animals: p.current_animals,
      ventilation_type: p.ventilation_type,
      water_source: p.water_source,
      feed_type: p.feed_type,
      site_id: p.site_id,
      site_name: sitesMap.get(p.site_id) ?? '—',

      animals_active: animalsCount.get(p.id) ?? 0,
      devices_total: devicesTotal.get(p.id) ?? 0,
      devices_online: devicesOnline.get(p.id) ?? 0,

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

      avg_body_temp_24h:
        tele && tele.temps.length
          ? Math.round(
              (tele.temps.reduce((s, n) => s + n, 0) / tele.temps.length) * 100,
            ) / 100
          : null,
      avg_activity_24h:
        tele && tele.acts.length
          ? Math.round(
              (tele.acts.reduce((s, n) => s + n, 0) / tele.acts.length) * 10,
            ) / 10
          : null,

      thi_series_24h: thiSeries,

      open_alerts: alertInfo?.count ?? 0,
      critical_alerts: alertInfo?.criticals ?? 0,
      highest_severity: alertInfo?.highest ?? null,
    };
  });

  // Filter has_alerts after building (needed alert info computed)
  if (filters.has_alerts) {
    penRows = penRows.filter((p) => p.open_alerts > 0);
  }

  return { pens: penRows, sites };
}

// ---------------------------------------------------------------------------
// 3. Pen detail (for drawer)
// ---------------------------------------------------------------------------

export async function getPenDetail(id: string): Promise<PenDetailData | null> {
  const sb = createClient();

  const { data: pen } = await sb
    .from('pens')
    .select(
      'id, pen_name, pen_type, capacity, current_animals, ventilation_type, water_source, feed_type, site_id, notes',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!pen) return null;

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    siteRes,
    animalsListRes,
    devicesRes,
    envRes,
    telemetryRes,
    alertsRes,
  ] = await Promise.all([
    sb
      .from('sites')
      .select('site_name')
      .eq('id', pen.site_id)
      .maybeSingle(),
    sb
      .from('animals')
      .select('id, tag_number, health_status, weight_kg')
      .eq('pen_id', id)
      .eq('active', true)
      .is('deleted_at', null)
      .order('tag_number'),
    sb
      .from('devices')
      .select('signal_status, active')
      .eq('pen_id', id),
    sb
      .from('environment_raw')
      .select(
        'ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
      )
      .eq('pen_id', id)
      .gte('timestamp', since7d)
      .order('timestamp', { ascending: true }),
    sb
      .from('telemetry_raw')
      .select('animal_id, body_temp_c, activity, timestamp')
      .eq('pen_id', id)
      .gte('timestamp', since7d)
      .order('timestamp', { ascending: false }),
    sb
      .from('alerts')
      .select(
        'id, timestamp, severity, status, alert_type, short_message, recommended_action, ai_insight',
      )
      .eq('pen_id', id)
      .eq('status', 'Open')
      .order('timestamp', { ascending: false })
      .limit(20),
  ]);

  // Bin env into 2hr buckets for charts
  const env = envRes.data ?? [];
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

  for (const r of env) {
    if (!r.timestamp) continue;
    const d = new Date(r.timestamp);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - (d.getHours() % 2));
    const key = d.toISOString();
    const cell = bucketMap.get(key) ?? {
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
    bucketMap.set(key, cell);
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

  // Hourly THI series (24h) for sparkline in overview
  const thiHourMap = new Map<string, { sum: number; count: number }>();
  const since24hMs = new Date(since24h).getTime();
  for (const r of env) {
    if (!r.timestamp || r.thi === null) continue;
    if (new Date(r.timestamp).getTime() < since24hMs) continue;
    const hour = new Date(r.timestamp).toISOString().slice(0, 13) + ':00:00Z';
    const cell = thiHourMap.get(hour) ?? { sum: 0, count: 0 };
    cell.sum += Number(r.thi);
    cell.count += 1;
    thiHourMap.set(hour, cell);
  }
  const thi_series_24h = Array.from(thiHourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, { sum, count }]) => ({
      hour,
      avg: Math.round((sum / count) * 10) / 10,
    }));

  // Latest env reading
  const lastEnv = env.length ? env[env.length - 1]! : null;
  const currentThi =
    lastEnv?.thi !== null && lastEnv?.thi !== undefined
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

  // Telemetry aggregates (24h)
  const tele24h = (telemetryRes.data ?? []).filter(
    (t) => new Date(t.timestamp).getTime() >= since24hMs,
  );
  const temps24h = tele24h
    .map((t) => Number(t.body_temp_c))
    .filter((n) => Number.isFinite(n));
  const acts24h = tele24h
    .map((t) => Number(t.activity))
    .filter((n) => Number.isFinite(n));
  const avg_body_temp_24h = temps24h.length
    ? Math.round((temps24h.reduce((s, n) => s + n, 0) / temps24h.length) * 100) / 100
    : null;
  const avg_activity_24h = acts24h.length
    ? Math.round((acts24h.reduce((s, n) => s + n, 0) / acts24h.length) * 10) / 10
    : null;

  // Latest reading per animal in pen
  const animalsList = animalsListRes.data ?? [];
  const animalIds = animalsList.map((a) => a.id);
  const latestPerAnimal = new Map<
    string,
    { body_temp_c: number | null; activity: number | null; timestamp: string }
  >();
  for (const t of telemetryRes.data ?? []) {
    if (!t.animal_id || latestPerAnimal.has(t.animal_id)) continue;
    if (!animalIds.includes(t.animal_id)) continue;
    latestPerAnimal.set(t.animal_id, {
      body_temp_c:
        t.body_temp_c !== null ? Number(t.body_temp_c) : null,
      activity: t.activity !== null ? Number(t.activity) : null,
      timestamp: t.timestamp,
    });
  }

  // Open alerts per animal
  const openAlertsByAnimal = new Map<string, number>();
  if (animalIds.length > 0) {
    const { data: animalAlerts } = await sb
      .from('alerts')
      .select('animal_id')
      .eq('status', 'Open')
      .in('animal_id', animalIds);
    for (const a of animalAlerts ?? []) {
      if (!a.animal_id) continue;
      openAlertsByAnimal.set(
        a.animal_id,
        (openAlertsByAnimal.get(a.animal_id) ?? 0) + 1,
      );
    }
  }

  const animals: PenAnimal[] = animalsList.map((a) => {
    const latest = latestPerAnimal.get(a.id);
    return {
      id: a.id,
      tag_number: a.tag_number,
      health_status: a.health_status,
      weight_kg: a.weight_kg,
      last_temp: latest?.body_temp_c ?? null,
      last_activity: latest?.activity ?? null,
      last_reading_at: latest?.timestamp ?? null,
      open_alerts: openAlertsByAnimal.get(a.id) ?? 0,
    };
  });

  // Alerts summary on pen
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
    id: pen.id,
    pen_name: pen.pen_name,
    pen_type: pen.pen_type as string,
    capacity: pen.capacity,
    current_animals: pen.current_animals,
    ventilation_type: pen.ventilation_type,
    water_source: pen.water_source,
    feed_type: pen.feed_type,
    site_id: pen.site_id,
    site_name: siteRes.data?.site_name ?? '—',
    notes: pen.notes,

    animals_active: animals.length,
    devices_total: devicesTotal,
    devices_online: devicesOnline,

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

    avg_body_temp_24h,
    avg_activity_24h,

    thi_series_24h,
    series_7d,
    animals,

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
        ai_insight: a.ai_insight,
      })),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
