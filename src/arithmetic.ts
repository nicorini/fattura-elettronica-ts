// Exact comparison of decimals, for the ranges of the XSD: JavaScript numbers already get
// 0.1 + 0.2 wrong. Internal module, not exposed by any entry in "exports".
import Big from 'big.js';

/** -1, 0 or 1 as `a` is less than, equal to or greater than `b`, both decimal strings. */
export function compare(a: string, b: string): number {
  return new Big(a).cmp(b);
}
