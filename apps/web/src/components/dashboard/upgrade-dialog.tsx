'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { useTenant } from '@/hooks/use-salon-data';
import { api } from '@/lib/api';
import { PLANS, PLAN_ORDER, planDef } from '@/lib/plans';
import type { Feature, PlanDef } from '@/lib/plans';
import type { Plan, Tenant } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional message shown at the top (e.g. why the upgrade was prompted). */
  reason?: string;
  /** Highlight the cheapest plan that unlocks this feature. */
  highlightFeature?: Feature;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  reason,
  highlightFeature,
}: UpgradeDialogProps) {
  const t = useTranslations('dashboard.upgrade');
  const tf = useTranslations('dashboard.upgrade.features');
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  const [loading, setLoading] = React.useState<Plan | null>(null);

  const currentPlan = tenant?.plan ?? 'STARTER';
  const currentOrder = PLAN_ORDER.indexOf(currentPlan);

  async function choose(plan: Plan) {
    setLoading(plan);
    try {
      const { url } = await api.billing.checkout(plan);
      window.location.href = url;
    } catch {
      // Stripe not configured — persist the plan change directly.
      try { await api.tenant.update({ plan }); } catch { /* offline demo */ }
      qc.setQueryData<Tenant>(['tenant'], (prev) =>
        prev ? { ...prev, plan } : prev,
      );
      toast.success(t('simulated', { plan: planDef(plan).name }));
      setLoading(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{reason ?? t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const def: PlanDef = PLANS[id];
            const isCurrent = id === currentPlan;
            const order = PLAN_ORDER.indexOf(id);
            const isHighlighted = highlightFeature
              ? def.features.includes(highlightFeature) &&
                !PLANS[currentPlan].features.includes(highlightFeature) &&
                order ===
                  PLAN_ORDER.findIndex((p) =>
                    PLANS[p].features.includes(highlightFeature),
                  )
              : id === 'PRO';

            return (
              <div
                key={id}
                className={cn(
                  'flex flex-col rounded-2xl border p-5',
                  isHighlighted && 'border-primary shadow-glow',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-bold">{def.name}</p>
                  {isCurrent && (
                    <Badge variant="secondary">{t('current')}</Badge>
                  )}
                </div>
                <p className="mt-1">
                  <span className="font-display text-2xl font-bold">
                    ${def.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t('perMonth')}
                  </span>
                </p>

                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {def.features.slice(0, 7).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{tf(f)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isHighlighted ? 'gradient' : 'outline'}
                  className="mt-5 w-full"
                  disabled={isCurrent || loading !== null}
                  onClick={() => choose(id)}
                >
                  {loading === id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent
                    ? t('current')
                    : order > currentOrder
                      ? t('upgradeTo', { plan: def.name })
                      : t('downgradeTo', { plan: def.name })}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
