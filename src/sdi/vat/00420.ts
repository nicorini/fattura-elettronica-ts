import type { Problem } from '../../problem.js';
import { bodies, riepiloghi } from '../fields.js';
import { type SdiRule, sdiError } from '../rule.js';
import { ELENCO_CONTROLLI, source } from '../sources.js';

/**
 * 00420: a DatiRiepilogo with EsigibilitaIVA S (split payment) and a Natura N6 or N6.x (reverse
 * charge), which exclude each other (Elenco controlli 2.0, p. 23).
 */
export const rule00420: SdiRule = (fattura) => {
  const problems: Problem[] = [];
  for (const body of bodies(fattura)) {
    for (const { block: riepilogo, path } of riepiloghi(body)) {
      const natura: unknown = riepilogo.Natura;
      if (riepilogo.EsigibilitaIVA !== 'S' || typeof natura !== 'string') continue;
      if (!/^N6(?:\.[1-9])?$/.test(natura)) continue;
      problems.push(
        sdiError(
          '00420',
          `${path}.EsigibilitaIVA`,
          `EsigibilitaIVA S (scissione dei pagamenti) non è ammessa con la Natura ${natura} (inversione contabile).`,
          source(ELENCO_CONTROLLI, 23),
        ),
      );
    }
  }
  return problems;
};
