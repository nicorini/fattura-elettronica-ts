// The formula of ImportoContributoCassa, in one place: createInvoice fills the blocks without one
// with it, and validate compares it.
import type Big from 'big.js';
import { percentOf, toBig } from './arithmetic.js';
import type { DatiCassaPrevidenziale } from './generated/model.js';

/**
 * The contribution of a cassa: ImponibileCassa × AlCassa / 100, to the cent. `undefined` if one of
 * the two is missing or not a decimal.
 */
export function importoContributoCassa(cassa: DatiCassaPrevidenziale): Big | undefined {
  const imponibile = toBig(cassa.ImponibileCassa);
  const aliquota = toBig(cassa.AlCassa);
  if (imponibile === undefined || aliquota === undefined) return undefined;
  return percentOf(imponibile, aliquota);
}
