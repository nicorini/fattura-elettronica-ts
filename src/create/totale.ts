// Step 6 of createInvoice: ImportoTotaleDocumento.
import type { Body } from '../sdi/fields.js';
import { hasScontoDocumento, importoTotaleDocumento } from '../totale.js';
import type { Problems } from './problems.js';
import type { Riepiloghi } from './riepilogo.js';

/**
 * Fills a missing ImportoTotaleDocumento with Σ ImponibileImporto + Σ Imposta of the
 * DatiRiepilogo, plus the Arrotondamento of the document. Not with a ScontoMaggiorazione of the
 * document: whether it applies before or after VAT is not in the format, so the total is the
 * user's.
 * When a DatiRiepilogo of the user has no amounts and none can be computed for it, a problem says
 * which one; any other missing amount comes from a value that another problem already reports.
 */
export function fillImportoTotaleDocumento(
  body: Body,
  riepiloghi: Riepiloghi,
  problems: Problems,
): void {
  const documento = body.datiDocumento;
  if (documento === undefined || documento.ImportoTotaleDocumento !== undefined) return;
  const path = `${body.documentoPath}.ImportoTotaleDocumento`;
  if (hasScontoDocumento(body)) {
    problems.add(
      'create.importoTotaleDocumento',
      path,
      'Il documento ha uno ScontoMaggiorazione: createInvoice non calcola il totale in questo caso, indica tu ImportoTotaleDocumento.',
    );
    return;
  }
  const total = importoTotaleDocumento(body);
  if (total !== undefined) {
    documento.ImportoTotaleDocumento = total.toFixed(2);
    return;
  }
  const reason = riepiloghi.missing(() => ['ImponibileImporto', 'Imposta']);
  if (reason === undefined) return;
  problems.add(
    'create.importoTotaleDocumento',
    path,
    `Manca ImportoTotaleDocumento e createInvoice non può calcolarlo: ${reason}. Indica gli importi di quel DatiRiepilogo, oppure ImportoTotaleDocumento.`,
  );
}
