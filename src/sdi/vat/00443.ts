import type { Problem } from '../../problem.js';
import { bodies, rateKey, riepiloghi, summarized } from '../fields.js';
import { type SdiRule, sdiError, sdiWarning } from '../rule.js';
import { ELENCO_CONTROLLI, RAPPRESENTAZIONE_TABELLARE, source } from '../sources.js';

/** 00443: a rate of cassa or line that no DatiRiepilogo has (Elenco controlli 2.0, p. 37). */
export const rule00443: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const rates = new Set(riepiloghi(body).map(({ block }) => rateKey(block.AliquotaIVA)));
    for (const { block, path } of summarized(body)) {
      const rate = rateKey(block.AliquotaIVA);
      if (rate === undefined || rates.has(rate)) continue;
      problems.push(
        sdiError(
          '00443',
          `${path}.AliquotaIVA`,
          `Nessun DatiRiepilogo ha AliquotaIVA ${rate}: ogni aliquota di righe e cassa ne vuole uno.`,
          source(ELENCO_CONTROLLI, 37),
        ),
      );
    }
  }
  return problems;
};

/**
 * sdi.00443.warn: a DatiRiepilogo whose rate no line nor cassa has. Only the Rappresentazione
 * tabellare (p. 7) checks this way round; the Elenco controlli and the Allegato A check lines and
 * cassa against the summaries. Skipped if a rate of lines or cassa can't be read.
 */
export const rule00443Warning: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const rates = new Set(summarized(body).map(({ block }) => rateKey(block.AliquotaIVA)));
    if (rates.has(undefined)) continue;
    for (const { block: riepilogo, path } of riepiloghi(body)) {
      const rate = rateKey(riepilogo.AliquotaIVA);
      if (rate === undefined || rates.has(rate)) continue;
      problems.push(
        sdiWarning(
          '00443',
          `${path}.AliquotaIVA`,
          `Nessuna riga e nessuna cassa ha AliquotaIVA ${rate}: il SdI potrebbe scartare il riepilogo (00443, o 00422 sull'imponibile).`,
          source(RAPPRESENTAZIONE_TABELLARE, 7),
        ),
      );
    }
  }
  return problems;
};
