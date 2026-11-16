import type { createCodes } from './codes.js';
import type { Problem } from './problem.js';

/** Codes of {@link ParseError}: stable, unlike the message. */
export type ParseErrorCode = 'xml.malformed' | 'xml.notFatturaPA' | 'xml.encoding' | 'xml.doctype';

/**
 * Thrown by `parse` when the input is not a FatturaPA at all. A FatturaPA that is only invalid
 * (missing field, unknown code) is read anyway: `validate` reports its problems.
 *
 * - `xml.malformed`: not well-formed XML; `line` and `column` (1-based) say where.
 * - `xml.notFatturaPA`: wrong root element or namespace, or unknown `versione`.
 * - `xml.encoding`: unsupported encoding, or bytes not valid in the declared one.
 * - `xml.doctype`: the XML has a `DOCTYPE`, refused against XXE and "billion laughs" attacks.
 *
 * The message is in Italian.
 */
export class ParseError extends Error {
  override readonly name: string = 'ParseError';
  /** What went wrong, stable across releases. */
  readonly code: ParseErrorCode;
  /** Line of the error (1-based), for `xml.malformed`. */
  readonly line?: number;
  /** Column of the error (1-based), for `xml.malformed`. */
  readonly column?: number;

  constructor(
    code: ParseErrorCode,
    message: string,
    options?: { line?: number; column?: number; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.code = code;
    if (options?.line !== undefined) this.line = options.line;
    if (options?.column !== undefined) this.column = options.column;
  }
}

/**
 * Thrown by `build` when the invoice has at least one `error` (of structure or of the SdI): the
 * file would be rejected. Warnings don't block, and are not in `problems`; `validate` lists them.
 * Pass `{ validate: false }` to `build` to write the file anyway.
 *
 * The message is in Italian and names the first error.
 */
export class BuildError extends Error {
  override readonly name: string = 'BuildError';
  /** The errors, in the order of the document; never empty. */
  readonly problems: readonly Problem[];

  constructor(problems: readonly Problem[]) {
    const [first] = problems;
    const count = problems.length === 1 ? '1 errore' : `${problems.length} errori`;
    super(
      `La fattura ha ${count} e non può essere scritta.${
        first === undefined
          ? ''
          : ` Il primo: ${first.path === '' ? '' : `${first.path}: `}${first.message}`
      }`,
    );
    this.problems = problems;
  }
}

/** Codes of {@link CreateInvoiceError}: stable, unlike the message. */
export type CreateInvoiceErrorCode = (typeof createCodes)[number];

/**
 * A problem of the input of `createInvoice`, with the same `code`, `path` and `message` as a
 * `Problem`.
 */
export interface CreateInvoiceProblem {
  /** What is wrong, stable across releases. */
  readonly code: CreateInvoiceErrorCode;
  /**
   * Where, with the names of the model:
   * `FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].Quantita`.
   */
  readonly path: string;
  /** What is wrong, in Italian. */
  readonly message: string;
}

/**
 * Thrown by `createInvoice` when it can't compute the invoice from the input. It lists every
 * problem of the input at once.
 *
 * - `create.number`: an amount, rate or quantity is a `number` that `decimal(n)` refuses (not
 *   finite, with an exponent, more than 15 significant digits) or a string that is not a decimal.
 * - `create.scontoAmbiguo`: a ScontoMaggiorazione of a line whose PrezzoTotale is computed has both
 *   Importo and Percentuale (the sources don't say which one the SdI counts), or a negative Importo
 *   (`Tipo` gives the direction, and the sources don't say how the SdI reads the sign).
 * - `create.imponibileCassa`: a DatiCassaPrevidenziale has neither ImponibileCassa nor
 *   ImportoContributoCassa: the base of the contributo is not something the library can pick.
 * - `create.importoRitenuta`: a DatiRitenuta has no ImportoRitenuta and is not the only block, or
 *   is not RT01 or RT02: `createInvoice` computes only the single RT01 or RT02.
 * - `create.importoTotaleDocumento`: no ImportoTotaleDocumento, and `createInvoice` can't compute
 *   it: the document has a ScontoMaggiorazione, or a DatiRiepilogo of the input has no amounts and
 *   none can be computed (its AliquotaIVA and Natura repeat an earlier DatiRiepilogo, or no line
 *   nor cassa has them).
 * - `create.importoPagamento`: a DettaglioPagamento has no ImportoPagamento and is not the only
 *   one of its body (how the total splits into instalments is the user's), or it is the only one
 *   and a DatiRiepilogo in split payment of the input has no Imposta that can be computed.
 *
 * The message is in Italian and names the first problem.
 */
export class CreateInvoiceError extends Error {
  override readonly name: string = 'CreateInvoiceError';
  /** The problems, in the order of the input; never empty. */
  readonly problems: readonly CreateInvoiceProblem[];

  constructor(problems: readonly CreateInvoiceProblem[]) {
    const [first] = problems;
    const count = problems.length === 1 ? '1 problema' : `${problems.length} problemi`;
    super(
      `L'ingresso di createInvoice ha ${count}.${
        first === undefined ? '' : ` Il primo: ${first.path}: ${first.message}`
      }`,
    );
    this.problems = problems;
  }
}
