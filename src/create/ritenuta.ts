// Step 5 of createInvoice: ImportoRitenuta of the only RT01 or RT02 DatiRitenuta.
import { datiRitenuta, importoRitenuta, isSingleRt01OrRt02 } from '../ritenuta.js';
import type { Body } from '../sdi/fields.js';
import type { Problems } from './problems.js';

/**
 * Fills the missing ImportoRitenuta of a single RT01 or RT02 block: AliquotaRitenuta % of the
 * PrezzoTotale of the lines and the ImportoContributoCassa of the casse with Ritenuta SI. Any
 * other block without an amount is a problem: RT03-RT06 are contributions with yearly ceilings the
 * invoice doesn't hold, and with more blocks the format doesn't say which one a flag belongs to.
 */
export function fillImportoRitenuta(body: Body, problems: Problems): void {
  const ritenute = datiRitenuta(body);
  const computed = isSingleRt01OrRt02(ritenute);
  for (const { block: ritenuta, path } of ritenute) {
    if (ritenuta.ImportoRitenuta !== undefined) continue;
    if (computed) {
      const importo = importoRitenuta(body, ritenuta);
      if (importo !== undefined) ritenuta.ImportoRitenuta = importo.toFixed(2);
    } else if (ritenute.length > 1) {
      problems.add(
        'create.importoRitenuta',
        `${path}.ImportoRitenuta`,
        'Manca ImportoRitenuta: con più DatiRitenuta createInvoice non sa a quale blocco vanno le righe con Ritenuta SI, indica tu ogni importo.',
      );
    } else {
      problems.add(
        'create.importoRitenuta',
        `${path}.ImportoRitenuta`,
        `Manca ImportoRitenuta: createInvoice calcola solo le ritenute RT01 e RT02, per ${String(ritenuta.TipoRitenuta)} indica tu l'importo.`,
      );
    }
  }
}
