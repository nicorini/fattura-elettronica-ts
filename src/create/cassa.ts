// Step 3 of createInvoice: ImportoContributoCassa of each DatiCassaPrevidenziale without one.
import { type Body, casse, toBig } from '../sdi/fields.js';
import { round2 } from '../sdi/vat/values.js';
import type { Problems } from './problems.js';

/**
 * Fills the missing ImportoContributoCassa: ImponibileCassa × AlCassa / 100, to the cent. The
 * base has to be in the input: the format doesn't say which lines form it, and with more blocks
 * only the user knows the share of each professional.
 */
export function fillImportoContributoCassa(body: Body, problems: Problems): void {
  for (const { block: cassa, path } of casse(body)) {
    if (cassa.ImportoContributoCassa !== undefined) continue;
    if (cassa.ImponibileCassa === undefined) {
      problems.add(
        'create.imponibileCassa',
        `${path}.ImponibileCassa`,
        'Manca ImponibileCassa, la base su cui calcolare il contributo: indicala, oppure scrivi tu ImportoContributoCassa. La libreria non sceglie le righe che formano la base.',
      );
      continue;
    }
    const imponibile = toBig(cassa.ImponibileCassa);
    const aliquota = toBig(cassa.AlCassa);
    if (imponibile === undefined || aliquota === undefined) continue;
    cassa.ImportoContributoCassa = round2(imponibile.times(aliquota).times('0.01')).toFixed(2);
  }
}
