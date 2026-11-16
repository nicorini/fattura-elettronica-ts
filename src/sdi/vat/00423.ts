import type Big from 'big.js';
import type { DettaglioLinee, ScontoMaggiorazione } from '../../generated/model.js';
import type { Problem } from '../../problem.js';
import { block as asBlock, bodies, lines, list, toBig } from '../fields.js';
import { type SdiRule, sdiWarning } from '../rule.js';
import { ALLEGATO_A, ELENCO_CONTROLLI, source } from '../sources.js';
import { compareAmount, type RoundDifference, withinTolerance } from './tolerance.js';
import { amount, round2 } from './values.js';

const TOLERANCE = '0.01';
const ROUND_DIFFERENCE: RoundDifference = { code: '00423', source: source(ALLEGATO_A, 51) };

/**
 * 00423: PrezzoTotale = PrezzoUnitario, adjusted by each ScontoMaggiorazione in order, × Quantita
 * (1 if missing). No rounding on the way; tolerance 0.01 €, on the difference rounded to the cent
 * (see `compareAmount`).
 *
 * Two points the sources leave open give more than one reading of the same line: how the SdI
 * reads a negative Importo (Tipo gives the direction; with its sign or as an absolute value?) and
 * which of Importo and Percentuale counts when a block has both and they disagree. The rule tries
 * every reading: the error only if none fits, `sdi.00423.warn` if some fit and some don't, nothing
 * more if all fit. `expected` is always the first reading: Importo over Percentuale, Importo with
 * its sign. A block whose Importo agrees with its Percentuale counts the Importo alone, so it adds
 * no reading (see `prezzoTotale`).
 */
export const rule00423: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block: linea, path } of lines(body)) {
      const actual = toBig(linea.PrezzoTotale);
      const candidates = openPoints(linea);
      const computed: { reading: Reading; result: Computed }[] = [];
      const options = readings(candidates);
      for (const reading of options) {
        const result = prezzoTotale(linea, reading);
        if (result !== undefined) computed.push({ reading, result });
      }
      // A reading that can't be computed leaves the line unjudged.
      if (actual === undefined || computed.length < options.length) continue;
      // A reading that makes no difference on this line is dropped: the Percentuale where every
      // block with both counted its Importo, because they agree; the absolute value where no
      // negative Importo counted.
      const all = computed
        .filter(({ reading, result }) => !reading.percentuale || result.percentuale)
        .filter(({ reading, result }) => !reading.absolute || result.negative)
        .map(({ reading, result }) => ({
          reading: result.negative ? reading : { percentuale: reading.percentuale },
          value: result.value,
        }));
      const open = { ...candidates, both: all.some(({ reading }) => reading.percentuale) };
      const [first] = all;
      if (first === undefined) continue;
      const at = `${path}.PrezzoTotale`;
      const fitting = all.filter(({ value }) =>
        withinTolerance(actual.minus(value).abs(), TOLERANCE, ROUND_DIFFERENCE),
      );
      if (fitting.length === 0 || fitting.length === all.length) {
        problems.push(
          ...compareAmount({
            sdiCode: '00423',
            path: at,
            field: 'PrezzoTotale',
            source: source(ELENCO_CONTROLLI, 26),
            tolerance: TOLERANCE,
            expected: first.value,
            actual,
            roundDifference: ROUND_DIFFERENCE,
          }),
        );
        continue;
      }
      const others = all.filter((candidate) => !fitting.includes(candidate));
      const describe = ({ reading, value }: { reading: Reading; value: Big }) =>
        `${label(reading, open)} (${amount(value)})`;
      problems.push(
        sdiWarning(
          '00423',
          at,
          `PrezzoTotale è ${amount(actual)}: torna ${fitting.map(describe).join(' o ')}, non ${others.map(describe).join(' né ')}.${advice(open)}`,
          source(ELENCO_CONTROLLI, 27),
          { expected: amount(first.value), actual: amount(actual) },
        ),
      );
    }
  }
  return problems;
};

/** The points the sources leave open that matter on a line. */
interface OpenPoints {
  /** A block has both Importo and Percentuale, and they disagree (or may, in `openPoints`). */
  readonly both: boolean;
  /** A block has a negative Importo. */
  readonly negative: boolean;
}

/** One way to read the blocks of a line. */
interface Reading {
  /** In a block with both, the Percentuale counts instead of the Importo. */
  readonly percentuale: boolean;
  /** A negative Importo counts without its sign; undefined if no negative Importo counts. */
  readonly absolute?: boolean;
}

/** The PrezzoTotale of one reading. */
interface Computed {
  readonly value: Big;
  /** A block with both Importo and Percentuale counted its Percentuale. */
  readonly percentuale: boolean;
  /** A negative Importo counted. */
  readonly negative: boolean;
}

/**
 * The open points as far as the blocks alone tell: whether Importo and Percentuale disagree depends
 * on the price of the cascade, known only once a reading is computed.
 */
function openPoints(linea: DettaglioLinee): OpenPoints {
  const blocks = list(linea.ScontoMaggiorazione).map(asBlock);
  return {
    both: blocks.some((b) => b?.Importo !== undefined && b.Percentuale !== undefined),
    negative: blocks.some((b) => negativeImporto(b)),
  };
}

function negativeImporto(block: ScontoMaggiorazione | undefined): boolean {
  return block?.Importo !== undefined && toBig(block.Importo)?.lt(0) === true;
}

/** Every combination of the open points, the first one being Importo with its sign. */
function readings(open: OpenPoints): Reading[] {
  return (open.both ? [false, true] : [false]).flatMap((percentuale) =>
    open.negative
      ? [
          { percentuale, absolute: false },
          { percentuale, absolute: true },
        ]
      : [{ percentuale }],
  );
}

function label(reading: Reading, open: OpenPoints): string {
  const parts: string[] = [];
  if (open.both) parts.push(reading.percentuale ? 'con la Percentuale' : "con l'Importo");
  if (reading.absolute !== undefined) {
    parts.push(
      reading.absolute
        ? "leggendo l'Importo negativo in valore assoluto"
        : "leggendo l'Importo negativo col segno",
    );
  }
  return parts.join(' e ');
}

function advice(open: OpenPoints): string {
  return [
    open.both
      ? " Le specifiche non dicono con chiarezza se il SdI considera l'Importo o la Percentuale quando uno ScontoMaggiorazione li ha entrambi: meglio indicarne uno solo."
      : '',
    open.negative
      ? ' Le specifiche non dicono come il SdI legge un Importo negativo: meglio indicare lo sconto o la maggiorazione con un Importo positivo e il Tipo giusto.'
      : '',
  ].join('');
}

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
function prezzoTotale(linea: DettaglioLinee, reading: Reading): Computed | undefined {
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
