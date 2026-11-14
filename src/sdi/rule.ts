// How a check of the SdI is written. Each check is a function in a file named by its code
// (00423.ts, or 00411-00415.ts for a check with two codes; a warning of the library by its
// subject), registered in the index of its group (src/sdi/vat, src/sdi/document); validate runs
// them all on the object. Read the invoice only through fields.ts.
import type { LibraryWarningCode, SdiErrorCode, SdiWarningCode } from '../codes.js';
import type { FatturaElettronica } from '../generated/model.js';
import type { Problem } from '../problem.js';

/** What a check may need besides the invoice. */
export interface RuleContext {
  /**
   * The day the SdI receives the invoice (`AAAA-MM-GG`): the `today` option of validate and build,
   * or today in Italy. `undefined` if the option is not a date: the checks on it are skipped.
   */
  readonly today: string | undefined;
}

/**
 * A check of the SdI: the problems it finds in `fattura`, in any order (validate sorts them).
 *
 * The invoice may break the XSD: fields typed as required may be missing, values may not match
 * their pattern, and decimals may have spaces around them (`xs:decimal` collapses them). A check
 * skips what it can't judge: the structural problem is already reported. A check must never
 * throw: validate turns an exception into the error `internal.rule`.
 */
export type SdiRule = (fattura: FatturaElettronica, context: RuleContext) => readonly Problem[];

/**
 * An error of the SdI: code `sdi.<sdiCode>`, with `source` (document and page, see sources.ts) and,
 * for the checks on amounts, `expected` and `actual`.
 */
export function sdiError(
  sdiCode: SdiErrorCode,
  path: string,
  message: string,
  source: string,
  amounts?: { readonly expected: string; readonly actual: string },
): Problem {
  return { code: `sdi.${sdiCode}`, sdiCode, path, message, severity: 'error', source, ...amounts };
}

/**
 * The warning for the part of a SdI check that the sources don't settle (only one document of the
 * Agenzia has it, or they leave it open): code `sdi.<sdiCode>.warn`, no `sdiCode`, because the SdI
 * may accept the invoice; with `expected` and `actual` for the checks on amounts.
 */
export function sdiWarning(
  sdiCode: SdiWarningCode,
  path: string,
  message: string,
  source: string,
  amounts?: { readonly expected: string; readonly actual: string },
): Problem {
  return { code: `sdi.${sdiCode}.warn`, path, message, severity: 'warning', source, ...amounts };
}

/** A warning of the library (`warn.tolerance`, `warn.codiceFiscale`…), with no SdI code. */
export function libraryWarning(
  code: LibraryWarningCode,
  path: string,
  message: string,
  details?: {
    readonly source?: string;
    readonly expected?: string;
    readonly actual?: string;
  },
): Problem {
  return { code, path, message, severity: 'warning', ...details };
}
