// The checks of the smoke test, shared by every runtime: each one brings the bytes of an official
// example its own way (file, fetch, embedded module).
import { parse, validate } from 'fattura-elettronica-ts';

/**
 * Reads and validates an official example with the published package; throws if anything is off.
 * @param {Uint8Array} xml
 * @returns {string}
 */
export function smoke(xml) {
  const fattura = parse(xml);
  if (fattura.versione !== 'FPR12') throw new Error(`Read versione ${fattura.versione}`);

  const { problems } = validate(xml);
  const structural = problems.filter((problem) => problem.code.startsWith('xsd.'));
  if (structural.length > 0) {
    throw new Error(`Problems of structure: ${JSON.stringify(structural)}`);
  }
  // The official examples have a P.IVA with a wrong check digit: the checks of the SdI ran.
  if (!problems.some((problem) => problem.code === 'sdi.00301')) {
    throw new Error(`The checks of the SdI did not run: ${JSON.stringify(problems)}`);
  }

  return `parse and validate work (${problems.length} problems, as expected).`;
}
