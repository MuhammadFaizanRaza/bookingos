'use client';

import { useTenant } from '@/hooks/use-salon-data';
import { getTerms, getVertical, type VerticalTerms } from '@/lib/verticals';
import type { VerticalDef } from '@/lib/verticals';

/**
 * Returns the industry term-pack for the current tenant's vertical, plus the
 * full vertical definition. Falls back to GENERAL terms while the tenant is
 * loading or when no vertical is set, so callers can always render labels.
 */
export function useTerms(): VerticalTerms & { vertical: VerticalDef } {
  const { data: tenant } = useTenant();
  const terms = getTerms(tenant?.vertical);
  return { ...terms, vertical: getVertical(tenant?.vertical) };
}
