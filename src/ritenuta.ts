// The formula of ImportoRitenuta on the full base, in one place: createInvoice fills the only RT01
// or RT02 block with it, and validate compares it.
import Big from 'big.js';
import { percentOf, sum, toBig } from './arithmetic.js';
import type { DatiRitenuta } from './generated/model.js';
import { type Body, blocks, casse, type Located, lines } from './sdi/fields.js';

/**
 * AliquotaRitenuta % of the PrezzoTotale of the lines and the ImportoContributoCassa of the casse
 * with Ritenuta SI, to the cent. `undefined` if one of these amounts is not a decimal.
 */
export function importoRitenuta(body: Body, ritenuta: DatiRitenuta): Big | undefined {
  const aliquota = toBig(ritenuta.AliquotaRitenuta);
  const base = sum(new Big(0), [
    ...lines(body).flatMap(({ block: linea }) =>
      linea.Ritenuta === 'SI' ? [linea.PrezzoTotale] : [],
    ),
    ...casse(body).flatMap(({ block: cassa }) =>
      cassa.Ritenuta === 'SI' ? [cassa.ImportoContributoCassa] : [],
    ),
  ]);
  if (base === undefined || aliquota === undefined) return undefined;
  return percentOf(base, aliquota);
}

/** The DatiRitenuta of a body. */
export function datiRitenuta(body: Body): Located<DatiRitenuta>[] {
  return blocks(body.datiDocumento?.DatiRitenuta, `${body.documentoPath}.DatiRitenuta`);
}

/** Whether the formula covers the ritenute of a body: a single block, of type RT01 or RT02. */
export function isSingleRt01OrRt02(ritenute: readonly Located<DatiRitenuta>[]): boolean {
  const tipo = ritenute[0]?.block.TipoRitenuta;
  return ritenute.length === 1 && (tipo === 'RT01' || tipo === 'RT02');
}
