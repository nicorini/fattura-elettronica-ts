// The three checks on amounts (00421, 00422, 00423) share how a difference is judged.

import type Big from 'big.js';
import type { SdiErrorCode, SdiWarningCode } from '../../codes.js';
import type { Problem } from '../../problem.js';
import { libraryWarning, sdiError, sdiWarning } from '../rule.js';
import { amount, round2 } from './values.js';

/**
 * A check whose difference is rounded to the cent before the comparison: a difference above the
 * tolerance that rounds within it is the `code` warning, citing `source`.
 */
export interface RoundDifference {
  readonly code: SdiWarningCode;
  readonly source: string;
}

/**
 * Compares the amount of the invoice with the one the rule computes. A difference above the
 * tolerance is the SdI error, judged on the exact `expected`. Within it, the `warn.tolerance`
 * comes only if `actual` is neither the exact `expected` nor `expected` rounded to the cent, which
 * is how a seller writes an amount of many decimals (1.23456789 × 3 written as 3.70); the warning
 * shows the rounded value.
 *
 * A difference equal to the tolerance passes. The Allegato A 1.9.1 rejects only a difference
 * "superiore a ±1 centesimo di euro" (pp. 51, 56) while the Elenco controlli 2.0 accepts only one
 * "inferiore a ±0,01" (pp. 24-27): the library follows the less strict.
 *
 * With `roundDifference` the error starts from 0.015, and a difference above 0.01 below that is a
 * warning: the real SdI accepted a PrezzoTotale off by 0.012 (FatturaElettronica.NET#394), which
 * neither document allows.
 */
export function compareAmount(check: {
  readonly sdiCode: SdiErrorCode;
  readonly path: string;
  readonly field: string;
  readonly source: string;
  readonly tolerance: string;
  readonly expected: Big;
  readonly actual: Big;
  readonly roundDifference?: RoundDifference;
}): Problem[] {
  const difference = check.actual.minus(check.expected).abs();
  if (!withinTolerance(difference, check.tolerance, check.roundDifference)) {
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
  const roundedExpected = round2(check.expected);
  const amounts = { expected: amount(roundedExpected), actual: amount(check.actual) };
  if (check.roundDifference !== undefined && difference.gt(check.tolerance)) {
    return [
      sdiWarning(
        check.roundDifference.code,
        check.path,
        `${check.field} è ${amounts.actual}, ma i dati della fattura danno ${amount(check.expected)}: la differenza di ${amount(difference)} supera di poco la tolleranza di ${check.tolerance} € delle specifiche. Il SdI ha accettato differenze così in casi reali, ma per sicurezza scrivi ${amounts.expected}.`,
        check.roundDifference.source,
        amounts,
      ),
    ];
  }
  if (difference.eq(0) || check.actual.eq(roundedExpected)) return [];
  return [
    libraryWarning(
      'warn.tolerance',
      check.path,
      `${check.field} è ${amounts.actual}, ma i dati della fattura danno ${amounts.expected}: il SdI accetta la differenza (tolleranza ${check.tolerance} €, controllo ${check.sdiCode}).`,
      { source: check.source, ...amounts },
    ),
  ];
}

/** Whether the SdI accepts `difference`; with `roundDifference`, once rounded to the cent. */
export function withinTolerance(
  difference: Big,
  tolerance: string,
  roundDifference?: RoundDifference,
): boolean {
  return (roundDifference === undefined ? difference : round2(difference)).lte(tolerance);
}
