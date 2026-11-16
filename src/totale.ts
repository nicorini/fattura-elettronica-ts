// The formula of ImportoTotaleDocumento, in one place: createInvoice fills it, and validate
// compares it.
import Big from 'big.js';
import { round2, sum } from './arithmetic.js';
import { type Body, list, riepiloghi } from './sdi/fields.js';

/**
 * Σ ImponibileImporto + Σ Imposta of the DatiRiepilogo, plus the Arrotondamento of the document.
 * `undefined` with a ScontoMaggiorazione of the document (whether it applies before or after VAT
 * is not in the format), or if one of these amounts is not a decimal.
 */
export function importoTotaleDocumento(body: Body): Big | undefined {
  const documento = body.datiDocumento;
  if (documento === undefined || hasScontoDocumento(body)) return undefined;
  const arrotondamento = documento.Arrotondamento ?? '0';
  const total = sum(new Big(0), [
    arrotondamento,
    ...riepiloghi(body).flatMap(({ block: riepilogo }) => [
      riepilogo.ImponibileImporto,
      riepilogo.Imposta,
    ]),
  ]);
  return total === undefined ? undefined : round2(total);
}

/** Whether the document has a ScontoMaggiorazione, which the formula doesn't cover. */
export function hasScontoDocumento(body: Body): boolean {
  return list(body.datiDocumento?.ScontoMaggiorazione).length > 0;
}
