// The formula of ImportoRitenuta on the full base, in one place: createInvoice fills the only RT01
// or RT02 block with it, and validate compares it.
import Big from 'big.js';
import type { DatiRitenuta } from './generated/model.js';
import { type Body, blocks, casse, type Located, lines, toBig } from './sdi/fields.js';
import { round2 } from './sdi/vat/values.js';

/**
 * AliquotaRitenuta % of the PrezzoTotale of the lines and the ImportoContributoCassa of the casse
 * with Ritenuta SI, to the cent. `undefined` if one of these amounts is not a decimal.
 */
export function importoRitenuta(body: Body, ritenuta: DatiRitenuta): Big | undefined {
  const aliquota = toBig(ritenuta.AliquotaRitenuta);
  let base: Big | undefined = new Big(0);
  for (const { block: linea } of lines(body)) {
    if (linea.Ritenuta === 'SI') base = add(base, linea.PrezzoTotale);
  }
  for (const { block: cassa } of casse(body)) {
    if (cassa.Ritenuta === 'SI') base = add(base, cassa.ImportoContributoCassa);
  }
  if (base === undefined || aliquota === undefined) return undefined;
  return round2(base.times(aliquota).times('0.01'));
}

/** The DatiRitenuta of a body. */
export function datiRitenuta(body: Body): Located<DatiRitenuta>[] {
  return blocks(body.datiDocumento?.DatiRitenuta, `${body.documento}.DatiRitenuta`);
}

function add(sum: Big | undefined, value: unknown): Big | undefined {
  const amount = toBig(value);
  return amount === undefined ? undefined : sum?.plus(amount);
}
