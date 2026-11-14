// Beyond 15 significant digits a JavaScript number no longer holds the value that was written:
// 12345678901.12345678 becomes 12345678901.123457, which would still pass the XSD pattern.
const MAX_SIGNIFICANT_DIGITS = 15;

/**
 * Converts a `number` into the string of an amount, as the model wants it: pads to 2 decimals
 * (`5` → `"5.00"`) and never rounds, so more decimals stay as they are (`validate` reports them if
 * the field allows fewer).
 *
 * @throws {RangeError} If `n` is not finite, its text has an exponent (`1e21`, `1e-7`), or it has
 * more than 15 significant digits (`0.1 + 0.2` is `0.30000000000000004`).
 * @example
 * decimal(5); // '5.00'
 * decimal(1.5); // '1.50'
 * decimal(0.1 + 0.2); // throws RangeError
 */
export function decimal(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`Il numero ${n} non è finito.`);
  const text = String(n);
  if (/e/i.test(text)) {
    throw new RangeError(`Il numero ${text} è scritto con l'esponente: usa una stringa.`);
  }
  const digits = text.replace(/^-/, '').replace('.', '').replace(/^0+/, '').replace(/0+$/, '');
  if (digits.length > MAX_SIGNIFICANT_DIGITS) {
    throw new RangeError(
      `Il numero ${text} ha più di ${MAX_SIGNIFICANT_DIGITS} cifre significative: usa una stringa.`,
    );
  }
  const [integer, fraction = ''] = text.split('.');
  return `${integer}.${fraction.padEnd(2, '0')}`;
}
