import { Prisma } from '@salonos/database';

/**
 * Decimal-safe money helpers built on Prisma.Decimal (decimal.js under the
 * hood). Always do money arithmetic with these — never with JS floats.
 */
export type DecimalLike = Prisma.Decimal | number | string;

export function dec(value: DecimalLike = 0): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function add(...values: DecimalLike[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.add(dec(v)), dec(0));
}

export function mul(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
  return dec(a).mul(dec(b));
}

export function sub(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
  return dec(a).sub(dec(b));
}

/** Round to 2 dp (currency). */
export function money(value: DecimalLike): Prisma.Decimal {
  return dec(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Convert a Decimal money value to integer minor units (cents) for Stripe. */
export function toMinorUnits(value: DecimalLike): number {
  return money(value).mul(100).toNearest(1).toNumber();
}

/** Clamp a Decimal to a minimum of 0. */
export function nonNegative(value: Prisma.Decimal): Prisma.Decimal {
  return value.isNegative() ? dec(0) : value;
}
