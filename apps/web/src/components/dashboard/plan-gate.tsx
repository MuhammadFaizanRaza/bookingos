'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { useTenant } from '@/hooks/use-salon-data';
import { hasFeature, requiredPlanFor } from '@/lib/plans';
import type { Feature } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UpgradeDialog } from './upgrade-dialog';

export function PlanGate({
  feature,
  children,
}: {
  feature: Feature;
  children: React.ReactNode;
}) {
  const t = useTranslations('dashboard.gate');
  const { data: tenant } = useTenant();
  const [open, setOpen] = React.useState(false);

  if (hasFeature(tenant?.plan, feature)) {
    return <>{children}</>;
  }

  const required = requiredPlanFor(feature);

  return (
    <>
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </span>
          <p className="mt-5 text-lg font-semibold">
            {t('locked', { plan: required.name })}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {t('lockedDesc')}
          </p>
          <Button
            variant="gradient"
            className="mt-6"
            onClick={() => setOpen(true)}
          >
            {t('upgrade')}
          </Button>
        </CardContent>
      </Card>

      <UpgradeDialog
        open={open}
        onOpenChange={setOpen}
        highlightFeature={feature}
      />
    </>
  );
}
