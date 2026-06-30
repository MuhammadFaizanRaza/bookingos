import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@bookingos/database';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    // Pin to the SDK's bundled API version (omit `apiVersion` to avoid
    // coupling the type to a specific version string).
    this.client = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') ?? 'sk_test_placeholder',
    );
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
  }

  /** Verify + parse a Stripe webhook event from the raw request body. */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  /** Map a SaaS Plan to its configured Stripe price id. */
  priceIdForPlan(plan: Plan): string {
    const map: Record<Plan, string | undefined> = {
      STARTER: this.config.get<string>('STRIPE_PRICE_STARTER'),
      PRO: this.config.get<string>('STRIPE_PRICE_PRO'),
      BUSINESS: this.config.get<string>('STRIPE_PRICE_BUSINESS'),
    };
    const price = map[plan];
    if (!price) {
      throw new Error(`No Stripe price configured for plan ${plan}`);
    }
    return price;
  }

  planForPriceId(priceId: string): Plan | null {
    const entries: [Plan, string | undefined][] = [
      ['STARTER', this.config.get<string>('STRIPE_PRICE_STARTER')],
      ['PRO', this.config.get<string>('STRIPE_PRICE_PRO')],
      ['BUSINESS', this.config.get<string>('STRIPE_PRICE_BUSINESS')],
    ];
    for (const [plan, price] of entries) {
      if (price && price === priceId) return plan;
    }
    return null;
  }
}
