import type { ProblemCode, SdiCode } from './codes.js';

/**
 * One problem found by `validate`. `code` and `path` are stable and meant for programs; `message`
 * is in Italian and meant for people, and may change between releases.
 *
 * Codes:
 * - `input.type`: a value of the wrong JavaScript type, e.g. a `number` where the model has a
 *   string, or a single object where it has an array; it is never converted.
 * - `xml.malformed`, `xml.notFatturaPA`, `xml.encoding`, `xml.doctype`: the input is not a
 *   FatturaPA at all (the same codes as `ParseError`).
 * - `xsd.required`, `xsd.unexpected`, `xsd.order`, `xsd.namespace`, `xsd.maxOccurs`,
 *   `xsd.choice`, `xsd.enumeration`, `xsd.pattern`, `xsd.length`, `xsd.range`: the invoice breaks
 *   the XSD.
 * - `sdi.<codice>` (`sdi.00423`): a check of the SdI, with `sdiCode` equal to the code.
 * - `sdi.<codice>.warn` and `warn.*`: warnings of the library; the SdI accepts the invoice.
 * - `option.today`: the option `today` is not a date `AAAA-MM-GG`.
 * - `internal.rule`: a check stopped on a bug of the library, so the invoice is not fully checked.
 *
 * Every code, with what it means and the source of each check of the SdI:
 * https://github.com/nicorini/fattura-elettronica-ts/blob/main/docs/controlli.md
 */
export interface Problem {
  /**
   * Stable code of the library: `xsd.pattern`, `sdi.00423`, `warn.tolerance`… (see `ProblemCode`).
   */
  readonly code: ProblemCode;
  /**
   * The error code the SdI would give: `00200` for every problem of structure, `00423`… for its
   * checks. Missing for the library's warnings and for `xml.*`.
   */
  readonly sdiCode?: SdiCode;
  /**
   * Where the problem is, with the names of the model:
   * `FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].PrezzoTotale`. Repeatable fields
   * have an index from 0; an attribute of the root is its name (`versione`); a problem of the
   * whole document has the empty path.
   */
  readonly path: string;
  /** What is wrong, in Italian. */
  readonly message: string;
  /** `error`: the SdI rejects the invoice; `warning`: it accepts it, but something looks wrong. */
  readonly severity: 'error' | 'warning';
  /** For the checks of the SdI: the document of the Agenzia delle Entrate and its page. */
  readonly source?: string;
  /** For the checks on amounts: the value the rule computes. */
  readonly expected?: string;
  /** For the checks on amounts: the value in the invoice. */
  readonly actual?: string;
}

/**
 * What `validate` found. `valid` is `true` when no problem is an `error`: warnings alone don't
 * make an invoice invalid.
 */
export interface ValidationResult {
  readonly valid: boolean;
  /**
   * Every problem, none left out, in the order of the document; for the same field, structure
   * first, then the checks of the SdI, then warnings.
   */
  readonly problems: readonly Problem[];
}
