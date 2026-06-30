// Central plan definition — drives pricing, feature-gating and usage limits
// across the dashboard. Keep in sync with apps/api/src/billing plan limits.

import type { Plan } from './types';

export type Feature =
  | 'booking'
  | 'calendar'
  | 'clients'
  | 'services'
  | 'staff'
  | 'pos'
  | 'reports'
  | 'inventory'
  | 'marketing'
  | 'reminders'
  | 'multiLocation'
  | 'customBranding'
  | 'apiAccess';

export interface PlanDef {
  id: Plan;
  name: string;
  /** monthly price in USD (display only) */
  price: number;
  maxStaff: number; // Infinity = unlimited
  maxLocations: number;
  features: Feature[];
}

export const PLANS: Record<Plan, PlanDef> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    maxStaff: 3,
    maxLocations: 1,
    features: ['booking', 'calendar', 'clients', 'services', 'staff', 'pos'],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    price: 69,
    maxStaff: 15,
    maxLocations: 3,
    features: [
      'booking',
      'calendar',
      'clients',
      'services',
      'staff',
      'pos',
      'reports',
      'inventory',
      'marketing',
      'reminders',
      'customBranding',
    ],
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business',
    price: 149,
    maxStaff: Infinity,
    maxLocations: Infinity,
    features: [
      'booking',
      'calendar',
      'clients',
      'services',
      'staff',
      'pos',
      'reports',
      'inventory',
      'marketing',
      'reminders',
      'multiLocation',
      'customBranding',
      'apiAccess',
    ],
  },
};

export const PLAN_ORDER: Plan[] = ['STARTER', 'PRO', 'BUSINESS'];

export function planDef(plan: Plan | undefined | null): PlanDef {
  return PLANS[plan ?? 'STARTER'] ?? PLANS.STARTER;
}

export function hasFeature(plan: Plan | undefined | null, feature: Feature): boolean {
  return planDef(plan).features.includes(feature);
}

/** The cheapest plan that includes a given feature (for upgrade prompts). */
export function requiredPlanFor(feature: Feature): PlanDef {
  for (const id of PLAN_ORDER) {
    if (PLANS[id].features.includes(feature)) return PLANS[id];
  }
  return PLANS.BUSINESS;
}

export function isUnlimited(n: number): boolean {
  return !Number.isFinite(n);
}
