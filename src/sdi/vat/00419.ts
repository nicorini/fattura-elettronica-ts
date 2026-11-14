import type { Problem } from '../../problem.js';
import { bodies, rateKey, riepiloghi, summarized } from '../fields.js';
import { type SdiRule, sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00419: fewer DatiRiepilogo than distinct rates of cassa and lines (Elenco controlli 2.0, p. 22).
 * It only counts: which rate is missing is 00443.
 */
export const rule00419: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const rates = new Set(summarized(body).map(({ block }) => rateKey(block.AliquotaIVA)));
    rates.delete(undefined);
    const summaries = riepiloghi(body).length;
    if (summaries < rates.size) {
      problems.push(
        sdiError(
          '00419',
          `${body.path}.DatiBeniServizi.DatiRiepilogo`,
          `Le righe e la cassa hanno ${rates.size} aliquote IVA diverse, ma i DatiRiepilogo sono ${summaries}: serve un riepilogo per ogni aliquota.`,
          source(ELENCO_CONTROLLI, 22),
        ),
      );
    }
  }
  return problems;
};
