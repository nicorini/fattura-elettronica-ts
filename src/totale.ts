// The formula of ImportoTotaleDocumento, in one place: createInvoice fills it, and validate
// compares it.
import Big from 'big.js';
import { type Body, list, riepiloghi, toBig } from './sdi/fields.js';
import { round2 } from './sdi/vat/values.js';

/**
 * Σ ImponibileImporto + Σ Imposta of the DatiRiepilogo, plus the Arrotondamento of the document.
 * `undefined` with a ScontoMaggiorazione of the document (whether it applies before or after VAT
 * is not in the format), or if one of these amounts is not a decimal.
 */
export function importoTotaleDocumento(body: Body): Big | undefined {
  const documento = body.datiDocumento;
  if (documento === undefined || hasScontoDocumento(body)) return undefined;
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
  return total === undefined ? undefined : round2(total);
}

/** Whether the document has a ScontoMaggiorazione, which the formula doesn't cover. */
export function hasScontoDocumento(body: Body): boolean {
  return list(body.datiDocumento?.ScontoMaggiorazione).length > 0;
}
