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
