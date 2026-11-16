// The formula of ImportoPagamento, in one place: createInvoice fills the only DettaglioPagamento
// with it, and validate can compare it.
import type Big from 'big.js';
import type { DettaglioPagamento } from './generated/model.js';
import { type Body, blocks, type Located, riepiloghi, toBig } from './sdi/fields.js';
import { round2 } from './sdi/vat/values.js';

/**
 * What the customer pays: ImportoTotaleDocumento less every ImportoRitenuta, which the customer
 * withholds when paying, and less the Imposta of the DatiRiepilogo with EsigibilitaIVA S, which in
 * split payment the customer pays to the Erario. `undefined` if one of these amounts is missing or
 * not a decimal.
 */
export function importoPagamento(body: Body): Big | undefined {
  const documento = body.datiDocumento;
  let amount = toBig(documento?.ImportoTotaleDocumento);
  for (const { block: ritenuta } of blocks(documento?.DatiRitenuta, '')) {
    amount = subtract(amount, ritenuta.ImportoRitenuta);
  }
  for (const { block: riepilogo } of riepiloghi(body)) {
    if (riepilogo.EsigibilitaIVA === 'S') amount = subtract(amount, riepilogo.Imposta);
  }
  return amount === undefined ? undefined : round2(amount);
}

/** The DettaglioPagamento of a body, across all its DatiPagamento. */
export function dettagliPagamento(body: Body): Located<DettaglioPagamento>[] {
  return blocks(body.body.DatiPagamento, `${body.path}.DatiPagamento`).flatMap(
    ({ block: pagamento, path }) =>
      blocks(pagamento.DettaglioPagamento, `${path}.DettaglioPagamento`),
  );
}

function subtract(amount: Big | undefined, value: unknown): Big | undefined {
  const other = toBig(value);
  return other === undefined ? undefined : amount?.minus(other);
}
