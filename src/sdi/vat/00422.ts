import Big from 'big.js';
import { toBig } from '../../arithmetic.js';
import type { Problem } from '../../problem.js';
import { type Body, bodies, casse, lines, rateKey, riepiloghi } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';
import { compareAmount } from './tolerance.js';

/**
 * 00422: for each rate of the lines and of DatiCassaPrevidenziale, Σ ImponibileImporto of the
 * DatiRiepilogo with that rate = Σ PrezzoTotale + Σ ImportoContributoCassa + Σ Arrotondamento of
 * those DatiRiepilogo; tolerance 1 €. The problem goes on the first DatiRiepilogo of the rate.
 *
 * The Elenco controlli takes the rates from lines and cassa only: a rate with no DatiRiepilogo has
 * a sum of zero, and the problem goes on DatiRiepilogo as a whole (00443 is given too); a
 * DatiRiepilogo whose rate has no line nor cassa is not checked (see sdi.00443.warn).
 */
export const rule00422: SdiRule = (fattura) => bodies(fattura).flatMap(checkBody);

interface Totals {
  expected: Big;
  actual: Big;
  /** The path of the first DatiRiepilogo of the rate. */
  first?: string;
}

function checkBody(body: Body): Problem[] {
  const totals = new Map<string, Totals>();
  const parts = [
    ...lines(body).map(({ block }) => [block.AliquotaIVA, block.PrezzoTotale]),
    ...casse(body).map(({ block }) => [block.AliquotaIVA, block.ImportoContributoCassa]),
  ];
  for (const [aliquota, importo] of parts) {
    const rate = rateKey(aliquota);
    const value = toBig(importo);
    // A value that can't be read leaves a sum unknown: the body is not judged.
    if (rate === undefined || value === undefined) return [];
    const entry = totals.get(rate) ?? { expected: new Big(0), actual: new Big(0) };
    entry.expected = entry.expected.plus(value);
    totals.set(rate, entry);
  }
  for (const { block: riepilogo, path } of riepiloghi(body)) {
    const rate = rateKey(riepilogo.AliquotaIVA);
    const entry = rate === undefined ? undefined : totals.get(rate);
    if (entry === undefined) continue;
    const imponibile = toBig(riepilogo.ImponibileImporto);
    const arrotondamento =
      riepilogo.Arrotondamento === undefined ? new Big(0) : toBig(riepilogo.Arrotondamento);
    if (imponibile === undefined || arrotondamento === undefined) return [];
    entry.actual = entry.actual.plus(imponibile);
    entry.expected = entry.expected.plus(arrotondamento);
    entry.first ??= path;
  }
  return [...totals.values()].flatMap((entry) =>
    compareAmount({
      sdiCode: '00422',
      path:
        entry.first === undefined
          ? `${body.path}.DatiBeniServizi.DatiRiepilogo`
          : `${entry.first}.ImponibileImporto`,
      field: 'ImponibileImporto',
      source: source(ELENCO_CONTROLLI, 25),
      tolerance: '1.00',
      expected: entry.expected,
      actual: entry.actual,
    }),
  );
}
