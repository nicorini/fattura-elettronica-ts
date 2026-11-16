import { round2, toBig } from '../../arithmetic.js';
import type { Problem } from '../../problem.js';
import { bodies, riepiloghi } from '../fields.js';
import type { SdiRule } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';
import { compareAmount } from './tolerance.js';

/**
 * 00421: in each DatiRiepilogo, Imposta = AliquotaIVA × ImponibileImporto / 100, rounded to the
 * cent half-up; tolerance 0.01 €.
 */
export const rule00421: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block: riepilogo, path } of riepiloghi(body)) {
      const aliquota = toBig(riepilogo.AliquotaIVA);
      const imponibile = toBig(riepilogo.ImponibileImporto);
      const actual = toBig(riepilogo.Imposta);
      if (aliquota === undefined || imponibile === undefined || actual === undefined) continue;
      problems.push(
        ...compareAmount({
          sdiCode: '00421',
          path: `${path}.Imposta`,
          field: 'Imposta',
          source: source(ELENCO_CONTROLLI, 24),
          tolerance: '0.01',
          expected: round2(aliquota.times(imponibile).times('0.01')),
          actual,
        }),
      );
    }
  }
  return problems;
};
