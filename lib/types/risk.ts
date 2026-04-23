import type { RiskLevel } from '@/lib/types/domain';

/**
 * Client-safe types and constants for the Farm Risk Score breakdown.
 *
 * Lives in lib/types/ (not lib/db/) so that Client Components like
 * RiskBreakdown.tsx can import these without dragging in `server-only`.
 *
 * The runtime functions (getFarmRiskScore, getRiskCategorySeries,
 * getActionItems) live in lib/db/kpi.ts and re-export these types for
 * consumer convenience.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RiskCategory = 'health' | 'environment' | 'feed' | 'operational';

export interface RiskDriver {
  alertType: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RiskCategoryBreakdown {
  category: RiskCategory;
  score: number;          // 0-10
  status: RiskLevel;
  drivers: RiskDriver[];
}

export interface FarmRiskScore {
  overall: number;        // 0-10, average of the 4 categories
  status: RiskLevel;
  categories: RiskCategoryBreakdown[];
}

export interface ActionItemSummary {
  id: string;
  siteId: string;
  siteName: string;
  date: string;           // YYYY-MM-DD
  actionText: string;
  status: 'open' | 'in_progress' | 'done' | 'skipped';
  assignedTo: string | null;
  assigneeEmail: string | null;
  notes: string | null;
  completedAt: string | null;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Static metadata (used by both server and client)
// -----------------------------------------------------------------------------

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  health: 'Health',
  environment: 'Environment',
  feed: 'Feed',
  operational: 'Operational',
};

export const RISK_CATEGORY_DESCRIPTIONS: Record<RiskCategory, string> = {
  health: 'Animal welfare & disease risk',
  environment: 'Climate, ventilation & THI',
  feed: 'Feed intake & silo levels',
  operational: 'Devices & infrastructure',
};

/**
 * Human-readable labels per alert_type. UI falls back to
 * `key.replace(/_/g, ' ')` if a type isn't here.
 */
export const DRIVER_LABELS: Record<string, string> = {
  fever_risk: 'Fever risk',
  combined_risk: 'Combined health risk',
  environment: 'Climate alerts',
  heat_stress_severe: 'Severe heat stress',
  heat_stress_moderate: 'Heat stress',
  heat_stress_mild: 'Mild heat stress',
  feed_drop: 'Feed intake drop',
  silo: 'Silo level low',
  low_growth: 'Low growth',
  device: 'Device fault',
};
