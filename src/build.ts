import { BuildError } from './errors.js';
import type { FatturaElettronica } from './generated/model.js';
import { type ValidateOptions, validate } from './validate.js';
import { writeDocument } from './write.js';

/** Options of `build`: those of `validate`, which it runs first, and whether to run it. */
export interface BuildOptions extends ValidateOptions {
  /** `false` writes the invoice even if it is not valid. */
  readonly validate?: boolean;
}

/**
 * Writes a FatturaPA as XML text, after checking it with `validate`: UTF-8 declaration, root
 * `p:FatturaElettronica` with the namespace declarations of the official examples and no
 * `xsi:schemaLocation`, 2-space indentation, fields in XSD order whatever the order of the
 * object's keys. Values are written exactly as given, with `&`, `<` and `>` escaped (and `"` in
 * the attributes of the root); the `Signature` is written as is.
 *
 * A signature written again on a changed invoice is no longer valid.
 *
 * @param options.validate `false` skips the check and writes the invoice even if it is not valid:
 * properties outside the model are dropped, and a value that XML can't hold (a control
 * character) makes a file that is not well-formed.
 * @param options.today Reference date (`AAAA-MM-GG`) of the check on dates in the future.
 * @throws {BuildError} If `validate` finds at least one error, an option `today` that is not a
 * date included (`option.today`); warnings don't block.
 * @example
 * const fattura = parse(readFileSync('fattura.xml'));
 * fattura.FatturaElettronicaHeader.DatiTrasmissione.ProgressivoInvio = '00002';
 * const xml = build(fattura); // throws BuildError if the SdI would reject it
 */
export function build(fattura: FatturaElettronica, options?: BuildOptions): string {
  if (options?.validate !== false) {
    const errors = validate(
      fattura,
      options?.today === undefined ? undefined : { today: options.today },
    ).problems.filter((problem) => problem.severity === 'error');
    if (errors.length > 0) throw new BuildError(errors);
  }
  return writeDocument(fattura);
}
