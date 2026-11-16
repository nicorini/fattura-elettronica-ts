// Exact decimal arithmetic, for the ranges of the XSD, the checks of the SdI and createInvoice:
// JavaScript numbers already get 0.1 + 0.2 wrong. Internal module, not exposed by any entry in
// "exports".
import Big from 'big.js';

/** -1, 0 or 1 as `a` is less than, equal to or greater than `b`, both decimal strings. */
export function compare(a: string, b: string): number {
  return new Big(a).cmp(b);
}

/**
 * A decimal of the invoice (`xs:decimal` allows spaces around it), or `undefined` if `value` is
 * not a string holding one.
 */
export function toBig(value: unknown): Big | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : undefined;
  return trimmed !== undefined && /^-?\d+(?:\.\d+)?$/.test(trimmed) ? new Big(trimmed) : undefined;
}

/** Rounds to 2 decimals, half-up away from zero (-2.345 → -2.35). */
export function round2(value: Big): Big {
  return value.round(2, Big.roundHalfUp);
}

/** `rate` % of `base`, rounded to the cent. */
export function percentOf(base: Big, rate: Big): Big {
  return round2(base.times(rate).times('0.01'));
}

/**
 * `start` plus each of `values` times `sign`; `undefined` if `start` or one of the values is not a
 * decimal, so one unreadable amount makes the whole sum unknown.
 */
export function sum(
  start: Big | undefined,
  values: readonly unknown[],
  sign: 1 | -1 = 1,
): Big | undefined {
  let result = start;
  for (const value of values) {
    const amount = toBig(value);
    if (amount === undefined || result === undefined) return undefined;
    result = sign > 0 ? result.plus(amount) : result.minus(amount);
  }
  return result;
}
