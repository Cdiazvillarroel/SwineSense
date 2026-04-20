/**
 * Domain-level types.
 *
 * These types represent *business concepts*, decoupled from Supabase's raw
 * schema. The data access layer (lib/db/*) is responsible for translating
 * between DB rows and these types.
 *
 * When the DB schema changes, lib/types/database.ts is regenerated but this
 * file stays stable — only the mapping in lib/db/* needs to adapt.
 */

// -----------------------------------------------------------------------------
// Enums (mirror Postgres enums)
// -----------------------------------------------------------------------------

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AlertStatus = 'Open' | 'In Progress' | 'Closed' | 'Snoozed';
export type PriorityLevel = 'Routine' | 'Attention' | 'Urgent' | 'Immediate';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe';
export type HealthStatus =
  | 'healthy'
  | 'monitoring'
  | 'sick'
  | 'recovering'
  | 'deceased';
export type DeviceType =
  | 'ear_tag'
  | 'env_probe'
  | 'silo_sensor'
  | 'water_flow'
  | 'camera'
  | 'gateway';
export type SignalStatus = 'online' | 'degraded' | 'offline';
export type PenType =
  | 'gestation'
  | 'farrowing'
  | 'nursery'
  | 'grower'
  | 'finisher'
  | 'boar'
  | 'isolation';

// -----------------------------------------------------------------------------
// Entities
// -----------------------------------------------------------------------------

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  managerName: string | null;
  location: string | null;
  timezone: string;
  totalAnimals: number;
  active: boolean;
  createdAt: string;
}

export interface Pen {
  id: string;
  siteId: string;
  name: string;
  type: PenType;
  capacity: number | null;
  currentAnimals: number;
  active: boolean;
}

export interface Animal {
  id: string;
  siteId: string;
  penId: string | null;
  deviceId: string | null;
  tagNumber: string;
  sex: 'M' | 'F' | null;
  ageDays: number | null;
  weightKg: number | null;
  healthStatus: HealthStatus;
  active: boolean;
}

export interface Device {
  id: string;
  siteId: string;
  penId: string | null;
  type: DeviceType;
  serialNumber: string;
  model: string | null;
  batteryStatus: number | null;
  firmwareVersion: string | null;
  signalStatus: SignalStatus;
  lastSeen: string | null;
  active: boolean;
}

// -----------------------------------------------------------------------------
// Alert (with AI fields)
// -----------------------------------------------------------------------------

export interface Alert {
  id: string;
  timestamp: string;
  siteId: string;
  siteName?: string;      // joined convenience
  penId: string | null;
  penName?: string;
  animalId: string | null;
  animalTag?: string;
  type: string;
  severity: AlertSeverity;
  score: number | null;
  triggerReason: string | null;

  // AI-generated
  aiInsight: string | null;
  likelyCause: string | null;
  recommendedAction: string | null;
  priorityLevel: PriorityLevel | null;
  shortMessage: string | null;
  requiresVetEscalation: boolean;

  // State
  status: AlertStatus;
  assignedTo: string | null;
  closedAt: string | null;
  notificationSent: boolean;

  // AI processing
  aiReady: boolean;
  aiProcessed: boolean;
  aiTimestamp: string | null;
  aiResponseStatus: 'pending' | 'success' | 'failed' | 'skipped';
}

// -----------------------------------------------------------------------------
// KPIs
// -----------------------------------------------------------------------------

export interface KpiOverview {
  date: string;                    // YYYY-MM-DD
  siteId: string;
  pensMonitored: number;
  animalsMonitored: number;
  environmentsMonitored: number;
  openAlerts: number;
  inProgressAlerts: number;
  closedAlerts: number;
  highAlerts: number;
  criticalAlerts: number;
  animalsAtRisk: number;
  feedRiskIndex: number | null;
  healthRiskIndex: number | null;
  environmentRiskIndex: number | null;
  operationalRiskIndex: number | null;
  devicesOffline: number;
  devicesLowBattery: number;
  dataFreshnessMinutes: number | null;
  overallStatus: RiskLevel | null;
}

export interface AnimalDailyAvg {
  date: string;
  siteId: string;
  penId: string | null;
  animalsCount: number;
  avgBodyTemp: number | null;
  maxBodyTemp: number | null;
  avgActivity: number | null;
  avgFeedIntake: number | null;
  feverSuspects: number;
  healthRiskLevel: RiskLevel | null;
}

export interface EnvironmentDailyAvg {
  date: string;
  siteId: string;
  penId: string | null;
  avgAmbientTemp: number | null;
  maxAmbientTemp: number | null;
  avgHumidity: number | null;
  avgThi: number | null;
  maxThi: number | null;
  heatStressHours: number;
  environmentRiskLevel: RiskLevel | null;
}

// -----------------------------------------------------------------------------
// Generic query helpers
// -----------------------------------------------------------------------------

export interface Paginated<T> {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
}

export interface DateRange {
  from: string;  // YYYY-MM-DD
  to: string;
}
