import type { Problem } from '../../problem.js';
import { bodies, rateKey, riepiloghi, summarized } from '../fields.js';
import { type SdiRule, sdiError, sdiWarning } from '../rule.js';
import { ELENCO_CONTROLLI, RAPPRESENTAZIONE_TABELLARE, source } from '../sources.js';

/**
 * 00444: a Natura of cassa or line that no DatiRiepilogo has (Elenco controlli 2.0, p. 38; its
 * pseudocode prints 00443 for the lines, a typo: title and Allegato A, p. 118, say 00444).
 */
export const rule00444: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const nature = new Set<unknown>(riepiloghi(body).map(({ block }) => block.Natura));
    for (const { block, path } of summarized(body)) {
      const natura: unknown = block.Natura;
      if (typeof natura !== 'string' || nature.has(natura)) continue;
      problems.push(
        sdiError(
          '00444',
          `${path}.Natura`,
          `Nessun DatiRiepilogo ha Natura ${natura}: ogni natura di righe e cassa ne vuole uno.`,
          source(ELENCO_CONTROLLI, 38),
        ),
      );
    }
  }
  return problems;
};

/**
 * sdi.00444.warn: a DatiRiepilogo whose Natura no line nor cassa has (Rappresentazione tabellare,
 * p. 7), as sdi.00443.warn for the rate. Skipped if a rate of lines or cassa can't be read.
 */
export const rule00444Warning: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    const found = summarized(body);
    if (found.some(({ block }) => rateKey(block.AliquotaIVA) === undefined)) continue;
    const nature = new Set<unknown>(found.map(({ block }) => block.Natura));
    for (const { block: riepilogo, path } of riepiloghi(body)) {
      const natura: unknown = riepilogo.Natura;
      if (typeof natura !== 'string' || nature.has(natura)) continue;
      problems.push(
        sdiWarning(
          '00444',
          `${path}.Natura`,
          `Nessuna riga e nessuna cassa ha Natura ${natura}: il SdI potrebbe scartare il riepilogo (00444).`,
          source(RAPPRESENTAZIONE_TABELLARE, 7),
        ),
      );
    }
  }
  return problems;
};
