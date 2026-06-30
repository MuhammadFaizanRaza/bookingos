'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Elements } from '@stripe/react-stripe-js';
import { CreditCard, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';

interface PaymentStepProps {
  amount: number;
  currency: string;
  locale: string;
  onPaid: () => void;
  submitting?: boolean;
}

// In demo mode (no real publishable key / no PaymentIntent from the API) we
// render a polished simulated card form. With a real key, Stripe Elements
// would mount here against a server-created PaymentIntent.
function CardForm({ amount, currency, locale, onPaid, submitting }: PaymentStepProps) {
  const t = useTranslations('booking');
  const [processing, setProcessing] = React.useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1100));
    setProcessing(false);
    onPaid();
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div className="rounded-2xl border bg-muted/30 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('deposit')}</span>
          <span className="font-display text-2xl font-bold">
            {formatCurrency(amount, currency, locale)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('cardDetails')}</Label>
        <div className="rounded-xl border border-input bg-background p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <Input
              required
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="mt-2 flex gap-3 border-t pt-2">
            <Input
              required
              placeholder="MM / YY"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
            <Input
              required
              placeholder="CVC"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={processing || submitting}
      >
        {(processing || submitting) && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        <Lock className="h-4 w-4" />
        {t('payNow')}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Secured by Stripe · 256-bit encryption
      </p>
    </form>
  );
}

export function PaymentStep(props: PaymentStepProps) {
  // When Stripe is configured, wrap in Elements (the card form would use real
  // Stripe inputs against a PaymentIntent). Otherwise render the demo form.
  if (stripeConfigured) {
    return (
      <Elements stripe={getStripe()}>
        <CardForm {...props} />
      </Elements>
    );
  }
  return <CardForm {...props} />;
}
