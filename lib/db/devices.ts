import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Devices repository.
 *
 * Three entry points:
 *   - getDevicesKpis()             → fleet-level KPI cards
 *   - getDevicesList(filters,page) → paginated table (50/page)
 *   - getDeviceDetail(id)          → drawer with type-specific telemetry
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceType =
  | 'ear_tag'
  | 'env_probe'
  | 'silo_sensor'
  | 'water_flow'
  | 'camera'
  | 'gateway';

export type SignalStatus = 'online' | 'degraded' | 'offline';

export type BatteryBucket = 'critical' | 'low' | 'medium' | 'healthy';

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface DevicesKpis {
  fleet: {
    total_active: number;
    total_inactive: number;
    by_type: { device_type: string; count: number }[];
  };
  signal: {
    online: number;
    degraded: number;
    offline: number;
    online_pct: number;
  };
  battery: {
    avg: number | null;
    by_bucket: { bucket: BatteryBucket; count: number }[];
    critical: number;
    low: number;
  };
  by_site: {
    site_id: string;
    site_name: string;
    total: number;
    issues: number;
  }[];
}

export interface DeviceListRow {
  id: string;
  serial_number: string;
  device_type: string;
  model: string | null;
  battery_status: number | null;
  signal_status: SignalStatus | null;
  last_seen: string | null;
  active: boolean;
  site_id: string;
  site_name: string;
  pen_id: string | null;
  pen_name: string | null;
  linked_animal_tag: string | null;
}

export interface DeviceListResult {
  rows: DeviceListRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  // For filter dropdowns
  sites: { id: string; site_name: string }[];
  pens: { id: string; pen_name: string; site_id: string }[];
}

export interface DeviceDetail {
  id: string;
  serial_number: string;
  device_type: string;
  model: string | null;
  install_date: string | null;
  firmware_version: string | null;
  battery_status: number | null;
  signal_status: SignalStatus | null;
  last_seen: string | null;
  active: boolean;
  notes: string | null;
  created_at: string | null;

  site_id: string;
  site_name: string;
  pen_id: string | null;
  pen_name: string | null;
  pen_type: string | null;

  // Linked entity (only set for ear_tag → animal)
  linked_animal_id: string | null;
  linked_animal_tag: string | null;
  linked_animal_health: string | null;

  // Telemetry — only one of these will be populated based on device_type
  earTagSeries: {
    bucket: string;
    body_temp: number | null;
    activity: number | null;
  }[];
  envProbeSeries: {
    bucket: string;
    temp: number | null;
    humidity: number | null;
    thi: number | null;
    ammonia: number | null;
    ventilation: number | null;
  }[];

  // Recent alerts that mention this device's serial number
  related_alerts: {
    id: string;
    timestamp: string;
    severity: AlertSeverity;
    status: string;
    alert_type: string;
    short_message: string | null;
    trigger_reason: string | null;
  }[];
}

export interface DeviceListFilters {
  site?: string;
  pen?: string;
  device_type?: string;
  signal_status?: string;
  low_battery?: boolean;
  search?: string;
}

const DEVICE_TYPES_VALID: readonly string[] = [
  'ear_tag',
  'env_probe',
  'silo_sensor',
  'water_flow',
  'camera',
  'gateway',
];

const SIGNAL_STATUSES_VALID: readonly string[] = [
  'online',
  'degraded',
  'offline',
];

const PAGE_SIZE = 50;

function isDeviceType(v: string): boolean {
  return DEVICE_TYPES_VALID.includes(v);
}
function isSignalStatus(v: string): boolean {
  return SIGNAL_STATUSES_VALID.includes(v);
}
function batteryBucket(b: number | null): BatteryBucket | null {
  if (b === null) return null;
  if (b < 15) return 'critical';
  if (b < 30) return 'low';
  if (b < 50) return 'medium';
  return 'healthy';
}

// ---------------------------------------------------------------------------
// 1. Fleet KPIs
// ---------------------------------------------------------------------------

export async function getDevicesKpis(): Promise<DevicesKpis> {
  const sb = createClient();

  const [devicesRes, sitesRes] = await Promise.all([
    sb
      .from('devices')
      .select('id, device_type, signal_status, battery_status, active, site_id'),
    sb
      .from('sites')
      .select('id, site_name')
      .is('deleted_at', null)
      .order('site_name'),
  ]);

  const devices = devicesRes.data ?? [];
  const sites = sitesRes.data ?? [];
  const active = devices.filter((d) => d.active === true);

  // By type
  const byType = new Map<string, number>();
  for (const d of active) {
    byType.set(
      d.device_type as string,
      (byType.get(d.device_type as string) ?? 0) + 1,
    );
  }

  // Signal counts
  let online = 0;
  let degraded = 0;
  let offline = 0;
  for (const d of active) {
    if (d.signal_status === 'online') online += 1;
    else if (d.signal_status === 'degraded') degraded += 1;
    else if (d.signal_status === 'offline') offline += 1;
  }
  const totalActive = active.length;
  const onlinePct =
    totalActive > 0 ? Math.round((online / totalActive) * 1000) / 10 : 0;

  // Battery
  const batteries = active
    .map((d) => d.battery_status)
    .filter((b): b is number => b !== null && Number.isFinite(b));
  const avgBattery =
    batteries.length > 0
      ? Math.round(
          (batteries.reduce((s, n) => s + n, 0) / batteries.length) * 10,
        ) / 10
      : null;

  const bucketCounts = new Map<BatteryBucket, number>([
    ['critical', 0],
    ['low', 0],
    ['medium', 0],
    ['healthy', 0],
  ]);
  let critCount = 0;
  let lowCount = 0;
  for (const d of active) {
    const b = batteryBucket(d.battery_status);
    if (!b) continue;
    bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
    if (b === 'critical') critCount += 1;
    if (b === 'low') lowCount += 1;
  }

  // By site
  const sitesMap = new Map(sites.map((s) => [s.id, s.site_name]));
  const bySiteAgg = new Map<string, { total: number; issues: number }>();
  for (const d of active) {
    const cell = bySiteAgg.get(d.site_id) ?? { total: 0, issues: 0 };
    cell.total += 1;
    const isIssue =
      d.signal_status === 'offline' ||
      d.signal_status === 'degraded' ||
      (d.battery_status !== null && d.battery_status < 30);
    if (isIssue) cell.issues += 1;
    bySiteAgg.set(d.site_id, cell);
  }
  const bySite = Array.from(bySiteAgg.entries())
    .map(([site_id, v]) => ({
      site_id,
      site_name: sitesMap.get(site_id) ?? '—',
      total: v.total,
      issues: v.issues,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    fleet: {
      total_active: totalActive,
      total_inactive: devices.length - totalActive,
      by_type: Array.from(byType.entries())
        .map(([device_type, count]) => ({ device_type, count }))
        .sort((a, b) => b.count - a.count),
    },
    signal: { online, degraded, offline, online_pct: onlinePct },
    battery: {
      avg: avgBattery,
      by_bucket: Array.from(bucketCounts.entries()).map(([bucket, count]) => ({
        bucket,
        count,
      })),
      critical: critCount,
      low: lowCount,
    },
    by_site: bySite,
  };
}

// ---------------------------------------------------------------------------
// 2. Paginated list
// ---------------------------------------------------------------------------

export async function getDevicesList(
  filters: DeviceListFilters,
  page: number,
): Promise<DeviceListResult> {
  const sb = createClient();
  const safePage = page > 0 ? page : 1;

  // Sites + pens for filter dropdowns
  const [sitesRes, pensRes] = await Promise.all([
    sb
      .from('sites')
      .select('id, site_name')
      .is('deleted_at', null)
      .order('site_name'),
    sb
      .from('pens')
      .select('id, pen_name, site_id')
      .eq('active', true)
      .is('deleted_at', null)
      .order('pen_name'),
  ]);

  const sites = sitesRes.data ?? [];
  const pens = pensRes.data ?? [];

  // Build filtered query
  let query = sb
    .from('devices')
    .select(
      'id, serial_number, device_type, model, battery_status, signal_status, last_seen, active, site_id, pen_id',
      { count: 'exact' },
    )
    .order('serial_number', { ascending: true });

  if (filters.site) {
    query = query.eq('site_id', filters.site);
  }
  if (filters.pen) {
    query = query.eq('pen_id', filters.pen);
  }
  if (filters.device_type && isDeviceType(filters.device_type)) {
    // Cast to satisfy enum type
    query = query.eq('device_type', filters.device_type as DeviceType);
  }
  if (filters.signal_status && isSignalStatus(filters.signal_status)) {
    query = query.eq('signal_status', filters.signal_status as SignalStatus);
  }
  if (filters.low_battery) {
    query = query.lt('battery_status', 30);
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    query = query.or(`serial_number.ilike.%${q}%,model.ilike.%${q}%`);
  }

  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: rows, count } = await query.range(from, to);

  const devicesRows = rows ?? [];
  const total = count ?? 0;

  // Resolve linked animal tag for any ear_tag rows on this page
  const earTagIds = devicesRows
    .filter((d) => d.device_type === 'ear_tag')
    .map((d) => d.id);

  const animalsByDeviceId = new Map<string, string>();
  if (earTagIds.length > 0) {
    const { data: animals } = await sb
      .from('animals')
      .select('device_id, tag_number')
      .in('device_id', earTagIds);
    for (const a of animals ?? []) {
      if (a.device_id) animalsByDeviceId.set(a.device_id, a.tag_number);
    }
  }

  const sitesMap = new Map(sites.map((s) => [s.id, s.site_name]));
  const pensMap = new Map(pens.map((p) => [p.id, p.pen_name]));

  const list: DeviceListRow[] = devicesRows.map((d) => ({
    id: d.id,
    serial_number: d.serial_number,
    device_type: d.device_type as string,
    model: d.model,
    battery_status: d.battery_status,
    signal_status: (d.signal_status as SignalStatus | null) ?? null,
    last_seen: d.last_seen,
    active: d.active === true,
    site_id: d.site_id,
    site_name: sitesMap.get(d.site_id) ?? '—',
    pen_id: d.pen_id,
    pen_name: d.pen_id ? (pensMap.get(d.pen_id) ?? null) : null,
    linked_animal_tag: animalsByDeviceId.get(d.id) ?? null,
  }));

  return {
    rows: list,
    total,
    page: safePage,
    page_size: PAGE_SIZE,
    total_pages: Math.ceil(total / PAGE_SIZE) || 1,
    sites,
    pens: pens.map((p) => ({ id: p.id, pen_name: p.pen_name, site_id: p.site_id })),
  };
}

// ---------------------------------------------------------------------------
// 3. Device detail (drawer)
// ---------------------------------------------------------------------------

export async function getDeviceDetail(id: string): Promise<DeviceDetail | null> {
  const sb = createClient();

  const { data: device } = await sb
    .from('devices')
    .select(
      'id, serial_number, device_type, model, install_date, firmware_version, battery_status, signal_status, last_seen, active, notes, created_at, site_id, pen_id',
    )
    .eq('id', id)
    .maybeSingle();

  if (!device) return null;

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [siteRes, penRes, animalRes] = await Promise.all([
    sb
      .from('sites')
      .select('site_name')
      .eq('id', device.site_id)
      .maybeSingle(),
    device.pen_id
      ? sb
          .from('pens')
          .select('pen_name, pen_type')
          .eq('id', device.pen_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    device.device_type === 'ear_tag'
      ? sb
          .from('animals')
          .select('id, tag_number, health_status')
          .eq('device_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Type-specific telemetry
  let earTagSeries: DeviceDetail['earTagSeries'] = [];
  let envProbeSeries: DeviceDetail['envProbeSeries'] = [];

  if (device.device_type === 'ear_tag' && animalRes.data) {
    const { data: tele } = await sb
      .from('telemetry_raw')
      .select('body_temp_c, activity, timestamp')
      .eq('animal_id', animalRes.data.id)
      .gte('timestamp', since7d)
      .order('timestamp', { ascending: true });

    earTagSeries = bin2hr(tele ?? [], (cell, r) => {
      if (r.body_temp_c !== null && Number.isFinite(Number(r.body_temp_c)))
        cell.body_temp.push(Number(r.body_temp_c));
      if (r.activity !== null && Number.isFinite(Number(r.activity)))
        cell.activity.push(Number(r.activity));
      return cell;
    }, () => ({ body_temp: [] as number[], activity: [] as number[] })).map(
      ([bucket, c]) => ({
        bucket,
        body_temp: c.body_temp.length ? round2(mean(c.body_temp)) : null,
        activity: c.activity.length ? round1(mean(c.activity)) : null,
      }),
    );
  } else if (device.device_type === 'env_probe') {
    const { data: env } = await sb
      .from('environment_raw')
      .select(
        'ambient_temp_c, humidity_pct, thi, ammonia_ppm, ventilation_score, timestamp',
      )
      .eq('device_id', id)
      .gte('timestamp', since7d)
      .order('timestamp', { ascending: true });

    envProbeSeries = bin2hr(env ?? [], (cell, r) => {
      if (r.ambient_temp_c !== null && Number.isFinite(Number(r.ambient_temp_c)))
        cell.temps.push(Number(r.ambient_temp_c));
      if (r.humidity_pct !== null && Number.isFinite(Number(r.humidity_pct)))
        cell.hums.push(Number(r.humidity_pct));
      if (r.thi !== null && Number.isFinite(Number(r.thi)))
        cell.thi.push(Number(r.thi));
      if (r.ammonia_ppm !== null && Number.isFinite(Number(r.ammonia_ppm)))
        cell.ams.push(Number(r.ammonia_ppm));
      if (r.ventilation_score !== null && Number.isFinite(Number(r.ventilation_score)))
        cell.vents.push(Number(r.ventilation_score));
      return cell;
    }, () => ({
      temps: [] as number[],
      hums: [] as number[],
      thi: [] as number[],
      ams: [] as number[],
      vents: [] as number[],
    })).map(([bucket, c]) => ({
      bucket,
      temp: c.temps.length ? round1(mean(c.temps)) : null,
      humidity: c.hums.length ? round1(mean(c.hums)) : null,
      thi: c.thi.length ? round1(mean(c.thi)) : null,
      ammonia: c.ams.length ? round1(mean(c.ams)) : null,
      ventilation: c.vents.length ? round1(mean(c.vents)) : null,
    }));
  }

  // Related alerts — anything mentioning this device's serial number
  const { data: alerts } = await sb
    .from('alerts')
    .select(
      'id, timestamp, severity, status, alert_type, short_message, trigger_reason',
    )
    .ilike('trigger_reason', `%${device.serial_number}%`)
    .order('timestamp', { ascending: false })
    .limit(10);

  return {
    id: device.id,
    serial_number: device.serial_number,
    device_type: device.device_type as string,
    model: device.model,
    install_date: device.install_date,
    firmware_version: device.firmware_version,
    battery_status: device.battery_status,
    signal_status: (device.signal_status as SignalStatus | null) ?? null,
    last_seen: device.last_seen,
    active: device.active === true,
    notes: device.notes,
    created_at: device.created_at,
    site_id: device.site_id,
    site_name: siteRes.data?.site_name ?? '—',
    pen_id: device.pen_id,
    pen_name: penRes.data?.pen_name ?? null,
    pen_type: (penRes.data?.pen_type as string | undefined) ?? null,

    linked_animal_id: animalRes.data?.id ?? null,
    linked_animal_tag: animalRes.data?.tag_number ?? null,
    linked_animal_health: animalRes.data?.health_status ?? null,

    earTagSeries,
    envProbeSeries,

    related_alerts: (alerts ?? [])
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
        trigger_reason: a.trigger_reason,
      })),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bin2hr<TIn extends { timestamp: string }, TCell>(
  rows: TIn[],
  reduce: (cell: TCell, row: TIn) => TCell,
  empty: () => TCell,
): [string, TCell][] {
  const map = new Map<string, TCell>();
  for (const r of rows) {
    if (!r.timestamp) continue;
    const d = new Date(r.timestamp);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - (d.getHours() % 2));
    const key = d.toISOString();
    map.set(key, reduce(map.get(key) ?? empty(), r));
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function mean(xs: number[]): number {
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
