// Step 2 of createInvoice: PrezzoTotale of each line without one.
import { negativeImporto, prezzoTotale } from '../prezzo-totale.js';
import { type Body, blocks, lines } from '../sdi/fields.js';
import { round2 } from '../sdi/vat/values.js';
import type { Problems } from './problems.js';

/**
 * Fills the missing PrezzoTotale, rounded to the cent only at the end. The formula is the one of
 * the check 00423, read as the input of createInvoice allows: each ScontoMaggiorazione with
 * either Importo or Percentuale, and a positive Importo, so the readings the sources leave open
 * (see src/sdi/vat/00423.ts) can't differ.
 */
export function fillPrezzoTotale(body: Body, problems: Problems): void {
  for (const { block: linea, path } of lines(body)) {
    if (linea.PrezzoTotale !== undefined) continue;
    let ambiguous = false;
    for (const { block, path: at } of blocks(
      linea.ScontoMaggiorazione,
      `${path}.ScontoMaggiorazione`,
    )) {
      if (block.Importo !== undefined && block.Percentuale !== undefined) {
        ambiguous = true;
        problems.add(
          'create.scontoAmbiguo',
          at,
          'Lo ScontoMaggiorazione ha sia Importo sia Percentuale: indicane uno solo, perché le specifiche non dicono quale dei due conta per il SdI.',
        );
      } else if (negativeImporto(block)) {
        ambiguous = true;
        problems.add(
          'create.scontoAmbiguo',
          `${at}.Importo`,
          "L'Importo dello ScontoMaggiorazione è negativo: indicalo positivo, la direzione la dà il Tipo (SC sconto, MG maggiorazione).",
        );
      }
    }
    if (ambiguous) continue;
    const computed = prezzoTotale(linea, { percentuale: false });
    if (computed !== undefined) linea.PrezzoTotale = round2(computed.value).toFixed(2);
  }
}
