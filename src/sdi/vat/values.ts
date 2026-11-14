// Amounts for the checks of this group: how they are rounded and written in a problem.
import Big from 'big.js';

/** A value for `expected` and `actual`: plain notation, at least 2 decimals (25 → 25.00). */
export function amount(value: Big): string {
  const plain = value.toFixed();
  const decimals = plain.split('.')[1]?.length ?? 0;
  return decimals >= 2 ? plain : value.toFixed(2);
}

/** Rounds to 2 decimals, half-up away from zero (-2.345 → -2.35). */
export function round2(value: Big): Big {
  return value.round(2, Big.roundHalfUp);
}
