// The formula of ImportoPagamento, in one place: createInvoice fills the only DettaglioPagamento
// with it, and validate compares it.
import type Big from 'big.js';
import { round2, sum, toBig } from './arithmetic.js';
import type { DettaglioPagamento } from './generated/model.js';
import { type Body, blocks, type Located, riepiloghi } from './sdi/fields.js';

/**
 * What the customer pays: ImportoTotaleDocumento less every ImportoRitenuta, which the customer
 * withholds when paying, and less the Imposta of the DatiRiepilogo with EsigibilitaIVA S, which in
 * split payment the customer pays to the Erario. `undefined` if one of these amounts is missing or
 * not a decimal.
 */
export function importoPagamento(body: Body): Big | undefined {
  const documento = body.datiDocumento;
  const amount = sum(
    toBig(documento?.ImportoTotaleDocumento),
    [
      ...blocks(documento?.DatiRitenuta, '').map(({ block: ritenuta }) => ritenuta.ImportoRitenuta),
      ...riepiloghi(body).flatMap(({ block: riepilogo }) =>
        riepilogo.EsigibilitaIVA === 'S' ? [riepilogo.Imposta] : [],
      ),
    ],
    -1,
  );
  return amount === undefined ? undefined : round2(amount);
}

/** The DettaglioPagamento of a body, across all its DatiPagamento. */
export function dettagliPagamento(body: Body): Located<DettaglioPagamento>[] {
  return blocks(body.block.DatiPagamento, `${body.path}.DatiPagamento`).flatMap(
    ({ block: pagamento, path }) =>
      blocks(pagamento.DettaglioPagamento, `${path}.DettaglioPagamento`),
  );
}
