// Step 6 of createInvoice: ImportoTotaleDocumento.
import type { Body } from '../sdi/fields.js';
import { hasScontoDocumento, importoTotaleDocumento } from '../totale.js';
import type { Problems } from './problems.js';

/**
 * Fills a missing ImportoTotaleDocumento with Σ ImponibileImporto + Σ Imposta of the
 * DatiRiepilogo, plus the Arrotondamento of the document. Not with a ScontoMaggiorazione of the
 * document: whether it applies before or after VAT is not in the format, so the total is the
 * user's.
 */
export function fillImportoTotaleDocumento(body: Body, problems: Problems): void {
  const documento = body.datiDocumento;
  if (documento === undefined || documento.ImportoTotaleDocumento !== undefined) return;
  if (hasScontoDocumento(body)) {
    problems.add(
      'create.importoTotaleDocumento',
      `${body.documento}.ImportoTotaleDocumento`,
      'Il documento ha uno ScontoMaggiorazione: createInvoice non calcola il totale in questo caso, indica tu ImportoTotaleDocumento.',
    );
    return;
  }
  const total = importoTotaleDocumento(body);
  if (total !== undefined) documento.ImportoTotaleDocumento = total.toFixed(2);
}
