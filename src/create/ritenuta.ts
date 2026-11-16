// Step 5 of createInvoice: ImportoRitenuta of the only RT01 or RT02 DatiRitenuta.
import Big from 'big.js';
import { type Body, blocks, casse, lines, toBig } from '../sdi/fields.js';
import { round2 } from '../sdi/vat/values.js';
import type { Problems } from './problems.js';

/**
 * Fills the missing ImportoRitenuta of a single RT01 or RT02 block: AliquotaRitenuta % of the
 * PrezzoTotale of the lines and the ImportoContributoCassa of the casse with Ritenuta SI. Any
 * other block without an amount is a problem: RT03-RT06 are contributions with yearly ceilings the
 * invoice doesn't hold, and with more blocks the format doesn't say which one a flag belongs to.
 */
export function fillImportoRitenuta(body: Body, problems: Problems): void {
  const ritenute = blocks(body.datiDocumento?.DatiRitenuta, `${body.documento}.DatiRitenuta`);
  for (const { block: ritenuta, path } of ritenute) {
    if (ritenuta.ImportoRitenuta !== undefined) continue;
    if (ritenute.length > 1) {
      problems.add(
        'create.importoRitenuta',
        `${path}.ImportoRitenuta`,
        'Manca ImportoRitenuta: con più DatiRitenuta createInvoice non sa a quale blocco vanno le righe con Ritenuta SI, indica tu ogni importo.',
      );
    } else if (ritenuta.TipoRitenuta !== 'RT01' && ritenuta.TipoRitenuta !== 'RT02') {
      problems.add(
        'create.importoRitenuta',
        `${path}.ImportoRitenuta`,
        `Manca ImportoRitenuta: createInvoice calcola solo le ritenute RT01 e RT02, per ${String(ritenuta.TipoRitenuta)} indica tu l'importo.`,
      );
    } else {
      const importo = computed(body, ritenuta.AliquotaRitenuta);
      if (importo !== undefined) ritenuta.ImportoRitenuta = importo;
    }
  }
}

/** AliquotaRitenuta % of the lines and casse with Ritenuta SI, to the cent. */
function computed(body: Body, aliquotaRitenuta: unknown): string | undefined {
  const aliquota = toBig(aliquotaRitenuta);
  let base: Big | undefined = new Big(0);
  for (const { block: linea } of lines(body)) {
    if (linea.Ritenuta === 'SI') base = add(base, linea.PrezzoTotale);
  }
  for (const { block: cassa } of casse(body)) {
    if (cassa.Ritenuta === 'SI') base = add(base, cassa.ImportoContributoCassa);
  }
  if (base === undefined || aliquota === undefined) return undefined;
  return round2(base.times(aliquota).times('0.01')).toFixed(2);
}

function add(sum: Big | undefined, value: unknown): Big | undefined {
  const amount = toBig(value);
  return amount === undefined ? undefined : sum?.plus(amount);
}
