// Step 6 of createInvoice: ImportoTotaleDocumento.
import Big from 'big.js';
import { type Body, list, riepiloghi, toBig } from '../sdi/fields.js';
import { round2 } from '../sdi/vat/values.js';
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
  if (list(documento.ScontoMaggiorazione).length > 0) {
    problems.add(
      'create.importoTotaleDocumento',
      `${body.documento}.ImportoTotaleDocumento`,
      'Il documento ha uno ScontoMaggiorazione: createInvoice non calcola il totale in questo caso, indica tu ImportoTotaleDocumento.',
    );
    return;
  }
  let total: Big | undefined =
    documento.Arrotondamento === undefined ? new Big(0) : toBig(documento.Arrotondamento);
  for (const { block: riepilogo } of riepiloghi(body)) {
    const imponibile = toBig(riepilogo.ImponibileImporto);
    const imposta = toBig(riepilogo.Imposta);
    total =
      imponibile === undefined || imposta === undefined
        ? undefined
        : total?.plus(imponibile).plus(imposta);
  }
  if (total !== undefined) documento.ImportoTotaleDocumento = round2(total).toFixed(2);
}
