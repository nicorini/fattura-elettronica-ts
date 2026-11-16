// The formula of PrezzoTotale, in one place: the check 00423 tries it with every reading of the
// points the sources leave open, createInvoice with the only one its input allows.
import type Big from 'big.js';
import { round2, toBig } from './arithmetic.js';
import type { DettaglioLinee, ScontoMaggiorazione } from './generated/model.js';
import { block as asBlock, list } from './sdi/fields.js';

/** One way to read the blocks of a line. */
export interface Reading {
  /** In a block with both, the Percentuale counts instead of the Importo. */
  readonly percentuale: boolean;
  /** A negative Importo counts without its sign; undefined if no negative Importo counts. */
  readonly absolute?: boolean;
}

/** The PrezzoTotale of one reading. */
export interface Computed {
  readonly value: Big;
  /** A block with both Importo and Percentuale counted its Percentuale. */
  readonly percentuale: boolean;
  /** A negative Importo counted. */
  readonly negative: boolean;
}

/** Whether `block` has a negative Importo. */
export function negativeImporto(block: ScontoMaggiorazione | undefined): boolean {
  return block?.Importo !== undefined && toBig(block.Importo)?.lt(0) === true;
}

// PrezzoTotale = PrezzoUnitario, adjusted by each ScontoMaggiorazione in order, × Quantita (1 if
// missing), with no rounding: undefined when a value can't be read.
//
// Each block changes the unit price already changed by the ones before it ("a cascata"). A block
// with both Importo and Percentuale counts one of the two. The Elenco controlli 2.0, p. 27, says
// "In caso di presenza contemporanea di Importo e Percentuale, si considera solo il primo ai fini
// del calcolo", which doesn't tell which one: Importo is named first, Percentuale comes first in
// the XSD. Its Caso 3 on p. 30 counts the Importo ("( Risultato1 - <Importo> secondo sconto )",
// "457.50 - 23.56 = 433.94"), an Importo equal to its Percentuale of the price, 5.15% of 457.50 =
// 23.56125, rounded to the cent
// (https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf).
// So when the Importo, as an absolute value, is the Percentuale of the current price rounded to
// the cent (half-up, away from zero), only the Importo counts. When they disagree, the block
// counts one of the two as `reading` says: no primary source tells which one wins, and only a
// secondary one, a 2016 note by Zucchetti, gives the precedence to the Importo
// (https://fattureoutsourcing.zucchetti.it/documenti/ARROTONDAMENTI_E_SCONTO.pdf).
export function prezzoTotale(linea: DettaglioLinee, reading: Reading): Computed | undefined {
  let price = toBig(linea.PrezzoUnitario);
  const quantita = linea.Quantita === undefined ? toBig('1') : toBig(linea.Quantita);
  if (price === undefined || quantita === undefined) return undefined;
  let usedPercentuale = false;
  let usedNegative = false;
  for (const item of list(linea.ScontoMaggiorazione)) {
    // A block that is not an object leaves the price unknown: the line is not judged.
    const block = asBlock(item);
    if (block === undefined) return undefined;
    const sign = block.Tipo === 'SC' ? -1 : block.Tipo === 'MG' ? 1 : undefined;
    if (sign === undefined) return undefined;
    const importo = toBig(block.Importo);
    const percentuale = toBig(block.Percentuale);
    const agree =
      importo !== undefined &&
      percentuale !== undefined &&
      importo.abs().eq(round2(percentuale.times(price).times('0.01').abs()));
    const useImporto =
      block.Importo !== undefined &&
      (block.Percentuale === undefined || !reading.percentuale || agree);
    if (block.Importo !== undefined && !useImporto) usedPercentuale = true;
    if (useImporto && negativeImporto(block)) usedNegative = true;
    let change: Big | undefined;
    if (useImporto) {
      change = toBig(block.Importo);
      if (reading.absolute) change = change?.abs();
    } else if (block.Percentuale !== undefined)
      change = toBig(block.Percentuale)?.times(price).times('0.01');
    else continue;
    if (change === undefined) return undefined;
    price = sign < 0 ? price.minus(change) : price.plus(change);
  }
  return { value: price.times(quantita), percentuale: usedPercentuale, negative: usedNegative };
}
