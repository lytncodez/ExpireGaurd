import type { InventoryItem } from '../api/types';

// Risk bands come from the server (item.riskStatus / item.daysToExpiry, using the pharmacy's
// thresholds from Settings). These helpers only fall back to a local calculation if they are missing.

export type RiskBand = 'Expired' | 'Critical' | 'Action Required' | 'Monitor' | 'Safe';

export interface RiskThresholds {
  criticalDays: number;
  actionDays: number;
  monitorDays: number;
  safeDays: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = { criticalDays: 7, actionDays: 30, monitorDays: 60, safeDays: 90 };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until expiry: 0 = expires today (already counted as Expired, matching the backend). */
export function daysToExpiry(item: Pick<InventoryItem, 'expiryDate' | 'daysToExpiry'>, now = Date.now()): number {
  if (typeof item.daysToExpiry === 'number') return item.daysToExpiry;
  const [y, m, d] = item.expiryDate.slice(0, 10).split('-').map(Number);
  const expiry = Date.UTC(y, (m || 1) - 1, d || 1);
  const today = new Date(now);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expiry - todayUtc) / DAY_MS);
}

export function classifyDays(days: number, t: RiskThresholds = DEFAULT_THRESHOLDS): RiskBand {
  if (days <= 0) return 'Expired';
  if (days <= t.criticalDays) return 'Critical';
  if (days <= t.actionDays) return 'Action Required';
  if (days <= t.monitorDays) return 'Monitor';
  return 'Safe';
}

export function riskBand(item: Pick<InventoryItem, 'expiryDate' | 'daysToExpiry' | 'riskStatus'>, t?: RiskThresholds): RiskBand {
  return item.riskStatus ?? classifyDays(daysToExpiry(item), t);
}
