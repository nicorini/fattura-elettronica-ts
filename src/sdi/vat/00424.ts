import type { Problem } from '../../problem.js';
import { bodies, casse, lines, riepiloghi, toBig } from '../fields.js';
import { type SdiRule, sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/** 00424: an AliquotaIVA above 0.00 and below 1.00 (`0.22` for 22%), on cassa, line or summary. */
export const rule00424: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block, path } of [...casse(body), ...lines(body), ...riepiloghi(body)]) {
      const rate = toBig(block.AliquotaIVA);
      if (rate === undefined || rate.eq(0) || rate.gte(1)) continue;
      problems.push(
        sdiError(
          '00424',
          `${path}.AliquotaIVA`,
          `AliquotaIVA ${rate.toFixed(2)} non è una percentuale: il 22% si scrive 22.00, non 0.22.`,
          source(ELENCO_CONTROLLI, 31),
        ),
      );
    }
  }
  return problems;
};
