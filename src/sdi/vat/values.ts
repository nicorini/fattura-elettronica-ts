// Amounts for the checks of this group: how they are written in a problem, and the warning on an
// amount that createInvoice computes.
import type Big from 'big.js';
import { toBig } from '../../arithmetic.js';
import type { LibraryWarningCode } from '../../codes.js';
import type { Problem } from '../../problem.js';
import { libraryWarning } from '../rule.js';

type ComputedAmountCode = Extract<
  LibraryWarningCode,
  | 'warn.importoContributoCassa'
  | 'warn.importoRitenuta'
  | 'warn.importoTotaleDocumento'
  | 'warn.importoPagamento'
>;

/** A value for `expected` and `actual`: plain notation, at least 2 decimals (25 → 25.00). */
export function amount(value: Big): string {
  const plain = value.toFixed();
  const decimals = plain.split('.')[1]?.length ?? 0;
  return decimals >= 2 ? plain : value.toFixed(2);
}

/**
 * The warning of the library on an amount that createInvoice would compute as `expected`, when
 * `actual` is a decimal that `accepts` refuses (by default, any other amount). None when either
 * can't be read.
 */
export function computedAmountWarning(check: {
  readonly code: ComputedAmountCode;
  readonly path: string;
  readonly actual: unknown;
  readonly expected: Big | undefined;
  readonly source: string;
  readonly message: (amounts: { readonly expected: string; readonly actual: string }) => string;
  readonly accepts?: (actual: Big, expected: Big) => boolean;
}): Problem[] {
  const actual = toBig(check.actual);
  const { expected } = check;
  const accepts = check.accepts ?? ((a: Big, e: Big) => a.eq(e));
  if (actual === undefined || expected === undefined || accepts(actual, expected)) return [];
  const amounts = { expected: amount(expected), actual: amount(actual) };
  return [
    libraryWarning(check.code, check.path, check.message(amounts), {
      source: check.source,
      ...amounts,
    }),
  ];
}
