// The three checks on amounts (00421, 00422, 00423) share how a difference is judged.

import type Big from 'big.js';
import type { SdiErrorCode } from '../../codes.js';
import type { Problem } from '../../problem.js';
import { libraryWarning, sdiError } from '../rule.js';
import { amount, round2 } from './values.js';

/**
 * Compares the amount of the invoice with the one the rule computes. A difference above the
 * tolerance is the SdI error, judged on the exact `expected`. Within it, the `warn.tolerance`
 * comes only if `actual` is neither the exact `expected` nor `expected` rounded to the cent, which
 * is how a seller writes an amount of many decimals (1.23456789 × 3 written as 3.70); the warning
 * shows the rounded value.
 *
 * A difference equal to the tolerance passes. The Allegato A 1.9.1 rejects only a difference
 * "superiore a ±1 centesimo di euro" (pp. 51, 56) while the Elenco controlli 2.0 accepts only one
 * "inferiore a ±0,01" (pp. 24-27): the library follows the less strict, which the real SdI
 * confirmed by accepting lines off by 0.01 (FatturaElettronica.NET#394).
 */
export function compareAmount(check: {
  readonly sdiCode: SdiErrorCode;
  readonly path: string;
  readonly field: string;
  readonly source: string;
  readonly tolerance: string;
  readonly expected: Big;
  readonly actual: Big;
}): Problem[] {
  const difference = check.actual.minus(check.expected).abs();
  if (difference.gt(check.tolerance)) {
    const amounts = { expected: amount(check.expected), actual: amount(check.actual) };
    return [
      sdiError(
        check.sdiCode,
        check.path,
        `${check.field} è ${amounts.actual}, ma i dati della fattura danno ${amounts.expected}: la differenza supera la tolleranza di ${check.tolerance} €.`,
        check.source,
        amounts,
      ),
    ];
  }
  const rounded = round2(check.expected);
  if (difference.eq(0) || check.actual.eq(rounded)) return [];
  const amounts = { expected: amount(rounded), actual: amount(check.actual) };
  return [
    libraryWarning(
      'warn.tolerance',
      check.path,
      `${check.field} è ${amounts.actual}, ma i dati della fattura danno ${amounts.expected}: il SdI accetta la differenza (tolleranza ${check.tolerance} €, controllo ${check.sdiCode}).`,
      { source: check.source, ...amounts },
    ),
  ];
}
