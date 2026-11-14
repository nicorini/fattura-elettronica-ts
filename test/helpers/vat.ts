// What the tests of the checks on amounts and VAT look at: the problems of structure, so that every
// invoice built by hand is known to be valid for the XSD, and the problems of this group. The
// checks on parties and document have their own tests.
import { type FatturaElettronica, type Problem, validate } from '../../src/index.js';

const VAT_WARNINGS = new Set(['warn.tolerance', 'warn.riferimentoNormativo']);

/** The problems of `fattura` that are about structure, amounts or VAT. */
export function vatProblems(fattura: FatturaElettronica): Problem[] {
  return validate(fattura).problems.filter((problem) =>
    problem.code.startsWith('sdi.')
      ? VAT_CODES.has(problem.code.slice(4, 9))
      : !problem.code.startsWith('warn.') || VAT_WARNINGS.has(problem.code),
  );
}

const VAT_CODES = new Set([
  '00400',
  '00401',
  '00411',
  '00413',
  '00414',
  '00415',
  '00419',
  '00420',
  '00421',
  '00422',
  '00423',
  '00424',
  '00429',
  '00430',
  '00437',
  '00438',
  '00443',
  '00444',
  '00445',
]);

/** Code, path, severity and source of the problems of `fattura`: what a check fixes. */
export const found = (fattura: FatturaElettronica) =>
  vatProblems(fattura).map(({ code, path, severity, source }) => ({
    code,
    path,
    severity,
    source,
  }));

/** An error of the SdI as `found` gives it, from the Elenco controlli at `page`. */
export const error = (code: string, path: string, page: number) => ({
  code: `sdi.${code}`,
  path,
  severity: 'error',
  source: `Elenco controlli SdI 2.0, p. ${page}`,
});

/** A warning of the SdI as `found` gives it, from the Rappresentazione tabellare at `page`. */
export const warning = (code: string, path: string, page: number) => ({
  code: `sdi.${code}.warn`,
  path,
  severity: 'warning',
  source: `Rappresentazione tabellare del tracciato fattura ordinaria, p. ${page}`,
});
