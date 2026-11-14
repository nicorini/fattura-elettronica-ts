import { ParseError } from './errors.js';
import type { FatturaElettronica } from './generated/model.js';
import type { Problem, ValidationResult } from './problem.js';
import { readFattura } from './read.js';
import { sdiRules } from './sdi/rules.js';
import { calendarDay, todayInRome } from './sdi/today.js';
import { checkObject } from './validation/object.js';
import { Report, sortProblems } from './validation/report.js';
import { checkXml } from './validation/xml.js';
import { openXml } from './xml/document.js';

/** Options of `validate`, and of `build`, which validates before writing. */
export interface ValidateOptions {
  /**
   * Reference date (`AAAA-MM-GG`) of the check on dates in the future (00403); today in Italy
   * (`Europe/Rome`) by default. A value that is not a date of the calendar is the error
   * `option.today`.
   */
  readonly today?: string;
}

/**
 * Lists every problem of a FatturaPA, given as XML (text or bytes, like `parse`) or as an object of
 * the model: the structure required by the XSD, then the checks the SdI makes that need only the
 * file. Never throws: an XML that is not a FatturaPA at all becomes an `xml.*` problem, and a bug
 * of the library in a check becomes the error `internal.rule`.
 *
 * - On XML it also sees what an object can't show: fields out of order (`xsd.order`), unknown
 *   elements (`xsd.unexpected`), elements in a namespace (`xsd.namespace`).
 * - On an object, a property the model doesn't have is `xsd.unexpected`; a leaf that is not a
 *   string, a repeatable field that is not an array (even with one item) and an array on a field
 *   that is not repeatable are `input.type`: values are never converted.
 *
 * The content of a `Signature` is not checked against the xmldsig schema, nor is the signature
 * verified.
 *
 * Problems come in the order of the document, all of them. `valid` is `true` when none is an
 * `error`; warnings point at something odd that the SdI accepts.
 *
 * @param options.today Reference date (`AAAA-MM-GG`) of the check on dates in the future; a value
 * that is not a date of the calendar is the error `option.today`.
 * @example
 * const { valid, problems } = validate(readFileSync('fattura.xml'));
 * for (const problem of problems) console.log(problem.path, problem.message);
 */
export function validate(
  input: string | Uint8Array | FatturaElettronica,
  options?: ValidateOptions,
): ValidationResult {
  const report = new Report();
  const fattura = checkStructure(input, report);
  if (fattura !== undefined) runRules(fattura, resolveToday(options?.today, report), report);
  return result(sortProblems(report.problems));
}

/**
 * Checks the structure of the invoice into `report`; the invoice to give to the checks of the SdI,
 * or `undefined` when there is none (not a FatturaPA, not an object, a bug while reading).
 */
function checkStructure(
  input: string | Uint8Array | FatturaElettronica,
  report: Report,
): FatturaElettronica | undefined {
  try {
    if (typeof input === 'string' || input instanceof Uint8Array) {
      const { text, root } = openXml(input);
      checkXml(root, report);
      return readFattura(root, text);
    }
    checkObject(input, report);
    return typeof input === 'object' && input !== null ? input : undefined;
  } catch (error) {
    if (error instanceof ParseError) {
      report.problems.push({
        code: error.code,
        path: '',
        message: error.message,
        severity: 'error',
      });
    } else {
      reportBug(report, error);
    }
    return undefined;
  }
}

/** The option `today`, today in Italy if missing; `undefined`, and an error, if not a date. */
function resolveToday(option: unknown, report: Report): string | undefined {
  if (option === undefined) return todayInRome();
  const today = calendarDay(option);
  if (today === undefined) {
    report.library(
      'option.today',
      '',
      `L'opzione today (${String(option)}) non è una data AAAA-MM-GG: il controllo sulla data della fattura (00403) non è stato fatto.`,
    );
  }
  return today;
}

function runRules(fattura: FatturaElettronica, today: string | undefined, report: Report): void {
  for (const rule of sdiRules) {
    try {
      report.problems.push(...rule(fattura, { today }));
    } catch (error) {
      reportBug(report, error);
    }
  }
}

/**
 * A check that throws: checks read the invoice defensively, so this is a bug. It is an error, so
 * that build doesn't write an invoice it could not check.
 */
function reportBug(report: Report, error: unknown): void {
  report.library(
    'internal.rule',
    '',
    `Un controllo della libreria si è interrotto per un errore interno (${String(error)}): la fattura non è stata controllata del tutto. È un difetto della libreria: segnalalo nelle issue del progetto.`,
  );
}

function result(problems: Problem[]): ValidationResult {
  return { valid: problems.every((problem) => problem.severity !== 'error'), problems };
}
