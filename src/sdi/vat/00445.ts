import type { Problem } from '../../problem.js';
import { bodies, casse, lines, riepiloghi } from '../fields.js';
import { type SdiRule, sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

const GENERIC = new Set(['N2', 'N3', 'N6']);

/**
 * 00445: the generic Natura N2, N3 and N6, which the XSD still lists, are refused since
 * 1 January 2021 on cassa, lines and summaries (Elenco controlli 2.0, p. 39).
 */
export const rule00445: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block, path } of [...casse(body), ...lines(body), ...riepiloghi(body)]) {
      const natura: unknown = block.Natura;
      if (typeof natura !== 'string' || !GENERIC.has(natura)) continue;
      problems.push(
        sdiError(
          '00445',
          `${path}.Natura`,
          `La Natura generica ${natura} non è più ammessa dal 2021: serve il codice di dettaglio (${natura}.1, ${natura}.2…).`,
          source(ELENCO_CONTROLLI, 39),
        ),
      );
    }
  }
  return problems;
};
